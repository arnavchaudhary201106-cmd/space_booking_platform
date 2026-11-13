import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Observable, of, timer } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { Role, ROLE_LABELS, User, assignableRoles } from '../../models/auth.model';
import { PasswordToggle } from '../../components/utility/password-toggle/password-toggle';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

// Same rules as the server: letters, digits, '_' and '-', 3-30 characters,
// with at least one letter and one number.
const USERNAME_PATTERN = /^(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9_-]{3,30}$/;
// Same check as the server: local-part@domain.tld, no spaces and a single '@'.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

@Component({
  selector: 'app-create-user',
  imports: [ReactiveFormsModule, PasswordToggle],
  templateUrl: './create-user.html',
  styleUrl: './create-user.scss',
})
export class CreateUser implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly title = inject(Title);

  private readonly auth = inject(AuthService);

  // What the signed-in user may create: super admins any role, admins admin and viewer.
  readonly roles = assignableRoles(this.auth.user()?.role).map((value) => ({
    value,
    label: ROLE_LABELS[value],
  }));

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly createdUser = signal<User | null>(null);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100), this.notBlank]],
    lastName: ['', [Validators.required, Validators.maxLength(100), this.notBlank]],
    username: [
      '',
      {
        validators: [Validators.required, Validators.pattern(USERNAME_PATTERN)],
        asyncValidators: [this.usernameAvailable()],
      },
    ],
    email: [
      '',
      [Validators.required, Validators.pattern(EMAIL_PATTERN), Validators.maxLength(255)],
    ],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    role: this.fb.nonNullable.control<Role>('VIEWER', Validators.required),
  });

  ngOnInit() {
    this.title.setTitle('Create User');
  }

  showError(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

  submit() {
    this.createdUser.set(null);
    this.errorMessage.set('');

    // The username check is asynchronous; wait for it to finish before submitting.
    if (this.form.pending) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.isSubmitting.set(true);

    this.userService
      .create({
        ...value,
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        username: value.username.trim(),
        email: value.email.trim(),
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (user) => {
          this.createdUser.set(user);
          this.form.reset({ role: value.role });
        },
        error: (err) => {
          this.errorMessage.set(
            err?.error?.detail || 'Could not create the user. Please try again.',
          );
          // The username may have been taken in the meantime.
          this.form.controls.username.updateValueAndValidity();
        },
      });
  }

  private notBlank(control: AbstractControl): ValidationErrors | null {
    return typeof control.value === 'string' && control.value.length > 0 && !control.value.trim()
      ? { required: true }
      : null;
  }

  // Asks the server whether the username is free, after a short pause in typing.
  // Angular cancels the previous run when the value changes, so only the last one is sent.
  private usernameAvailable(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> =>
      timer(400).pipe(
        switchMap(() => this.userService.isUsernameAvailable(String(control.value).trim())),
        map((available) => (available ? null : { usernameTaken: true })),
        // If the check fails, the server still rejects a duplicate on submit.
        catchError(() => of(null)),
      );
  }
}
