import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-teacher-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './teacher-navbar.component.html',
  styleUrl: './teacher-navbar.component.scss',
})
export class TeacherNavbarComponent {
  menuOpen = false;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = computed(() => this.authService.getUser());

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  async logout(): Promise<void> {
    this.authService.logout();
    this.closeMenu();
    await this.router.navigate(['/']);
  }

  get userInitials(): string {
    const user = this.currentUser();
    const name = user?.full_name?.trim() || user?.username?.trim() || 'T';
    const parts = name.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return name.slice(0, 2).toUpperCase();
  }
}
