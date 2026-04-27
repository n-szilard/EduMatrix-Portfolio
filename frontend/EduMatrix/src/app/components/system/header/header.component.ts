import { Component, HostListener, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import type { RoleName, UserDto } from '../../../services/user.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  isScrolled = false;
  menuOpen = false;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());
  readonly currentUser = computed(() => this.authService.getUser() as UserDto | null);
  readonly currentRole = computed(() => (this.authService.getRole() as RoleName | null));

  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled = window.scrollY > 20;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  goToRoleHome(): void {
    const role = this.currentRole();
    if (!role) {
      this.router.navigate(['/login']);
      return;
    }

    if (role === 'admin') {
      this.router.navigate(['/admin/dashboard']);
      return;
    }

    if (role === 'teacher') {
      this.router.navigate(['/teacher/dashboard']);
      return;
    }

    if (role === 'student') {
      this.router.navigate(['/student/dashboard']);
      return;
    }

    if (role === 'parent') {
      // TODO: ha lesz szülői felület, ide kell irányítani
      this.router.navigate(['/']);
      return;
    }

    if (role === 'pending') {
      this.router.navigate(['/pending']);
      return;
    }

    this.router.navigate(['/']);
  }
}