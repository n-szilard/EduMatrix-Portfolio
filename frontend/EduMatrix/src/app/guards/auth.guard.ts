import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RoleName } from '../services/user.service';

// Token ellenőrzés - ha nincs token -> login
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const token = authService.getToken();
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
    const authService = inject(AuthService);
    const token = authService.getToken();
    const user = token ? authService.getUser() : null;

    if (!token || !user?.role || !allowedRoles.includes(user.role)) {
      router.navigate(!token ? ['/login'] : ['/']);
      return false;
    }
    return true;
  };
};
