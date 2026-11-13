import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { finalize } from 'rxjs/operators';
import { PasswordToggle } from '../../components/utility/password-toggle/password-toggle';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, PasswordToggle],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required],
  });

  ngOnInit() {
    this.title.setTitle('Login');
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { identifier, password } = this.form.getRawValue();
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.auth
      .login(identifier.trim(), password)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => this.router.navigateByUrl(this.returnUrl()),
        error: (err) =>
          this.errorMessage.set(
            err?.status === 401
              ? 'Invalid username/email or password.'
              : err?.error?.detail || 'Could not sign in. Please try again.',
          ),
      });
  }

  // Only same-site paths are allowed, so a crafted link can't redirect elsewhere.
  private returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/events';
  }
}
