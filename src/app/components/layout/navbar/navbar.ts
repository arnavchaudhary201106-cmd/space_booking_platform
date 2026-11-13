import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ROLE_LABELS } from '../../../models/auth.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly roleLabels = ROLE_LABELS;

  // The user card shows while hovering the icon, or after clicking it (for touch screens).
  readonly hovered = signal(false);
  readonly pinned = signal(false);
  readonly isOpen = computed(() => this.hovered() || this.pinned());

  togglePinned() {
    this.pinned.update((pinned) => !pinned);
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: Event) {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  close() {
    this.pinned.set(false);
    this.hovered.set(false);
  }

  logout() {
    this.close();
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
