import { Component, input, signal } from '@angular/core';

/**
 * Button that shows or hides the text of a password input.
 * Usage: <input #pw type="password" /> <button appPasswordToggle [input]="pw"></button>
 */
@Component({
  selector: 'button[appPasswordToggle]',
  templateUrl: './password-toggle.html',
  host: {
    type: 'button',
    class: 'btn btn-outline-secondary d-flex align-items-center',
    '[attr.aria-label]': 'visible() ? "Hide password" : "Show password"',
    '[attr.aria-pressed]': 'visible()',
    '[title]': 'visible() ? "Hide password" : "Show password"',
    '(click)': 'toggle()',
  },
})
export class PasswordToggle {
  readonly input = input.required<HTMLInputElement>();
  readonly visible = signal(false);

  toggle() {
    this.visible.update((visible) => !visible);
    this.input().type = this.visible() ? 'text' : 'password';
  }
}
