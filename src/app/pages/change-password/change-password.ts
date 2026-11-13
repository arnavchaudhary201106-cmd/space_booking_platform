import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { finalize } from 'rxjs/operators';
import { PasswordToggle } from '../../components/utility/password-toggle/password-toggle';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-change-password',
  imports: [ReactiveFormsModule, PasswordToggle],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss',
})
export class ChangePassword implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly title = inject(Title);

  readonly isSubmitting = signal(false);
  readonly isChanged = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: [this.passwordsMatch, this.passwordChanged] },
  );

  ngOnInit() {
    this.title.setTitle('Change Password');
  }

  submit() {
    this.isChanged.set(false);
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.form.getRawValue();
    this.isSubmitting.set(true);

    this.auth
      .changePassword(currentPassword, newPassword)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.isChanged.set(true);
          this.form.reset();
        },
        error: (err) =>
          this.errorMessage.set(
            err?.error?.detail || 'Could not change the password. Please try again.',
          ),
      });
  }

  private passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const { newPassword, confirmPassword } = group.value;
    return confirmPassword && newPassword !== confirmPassword ? { mismatch: true } : null;
  }

  private passwordChanged(group: AbstractControl): ValidationErrors | null {
    const { currentPassword, newPassword } = group.value;
    return newPassword && newPassword === currentPassword ? { unchanged: true } : null;
  }
}
