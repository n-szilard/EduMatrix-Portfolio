import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { RoleName } from '../services/user.service';

// Token ellenőrzés - ha nincs token -> login
export const authGuard: CanActivateFn = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    inject(Router).navigate(['/login']);
    return false;
  }
  return true;
};

// Szerepkör ellenőrzés - token + engedélyezett role szükséges
export const roleGuard = (allowedRoles: RoleName[]): CanActivateFn => {
  return () => {
    const router = inject(Router);
    const token = localStorage.getItem('token');
    const user = token ? JSON.parse(localStorage.getItem('user') || '{}') : null;

    if (!token || !user?.role || !allowedRoles.includes(user.role)) {
      router.navigate(!token ? ['/login'] : ['/']);
      return false;
    }
    return true;
  };
};
