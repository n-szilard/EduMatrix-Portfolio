import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';

export type AdminNavLink = {
  icon: string;
  label: string;
  routerLink?: any[] | string;
};

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, DividerModule],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.scss',
})
export class AdminSidebarComponent {
  @Input() navLinks: AdminNavLink[] = [];

  @Input() userName = '—';
  @Input() userRoleLabel = '—';
  @Input() avatarUrl?: string;

  // Később ide lehet hookolni auth service-t.
  signOut() {
    // noop
  }
}
