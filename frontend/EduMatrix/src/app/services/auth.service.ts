import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { UserDto, RoleName } from './user.service';

interface LoginPayload {
  username: string;
  password: string;
}

interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: UserDto;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiBaseUrl = 'http://localhost:4000/api';
  private readonly tokenKey = 'token';
  private readonly userKey = 'user';
  
  private currentUserSubject = new BehaviorSubject<UserDto | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  
  public readonly currentUser$ = this.currentUserSubject.asObservable();
  public readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  private tokenExpirationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private http: HttpClient) {
    this.initializeAuthState();
  }

  // Bejelentkezés felhasználónévvel és jelszóval.
  login(username: string, password: string, remember: boolean = false): Observable<LoginResponse> {
    const payload: LoginPayload = { username, password };
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/users/login`, payload).pipe(
      tap(response => {
        this.storeAuthData(response.token, response.user, remember);
        this.currentUserSubject.next(response.user);
        this.isAuthenticatedSubject.next(true);
        this.setupTokenExpirationTimer(response.token);
      })
    );
  }

  // Új felhasználó regisztrálása.
  register(
    firstName: string,
    lastName: string,
    email: string,
    username: string,
    password: string
  ): Observable<any> {
    const payload: RegisterPayload = {
      firstName,
      lastName,
      email,
      username,
      password
    };
    return this.http.post(`${this.apiBaseUrl}/users/register`, payload);
  }

  // Kijelentkeztetés és állapot törlése.
  logout(): void {
    this.clearAuthData();
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.clearTokenExpirationTimer();
  }

  // Mentett JWT token lekérése.
  getToken(): string | null {
    return this.getFromStorage(this.tokenKey);
  }

  // Mentett felhasználói adatok lekérése.
  getUser(): UserDto | null {
    return this.getUserFromStorage();
  }

  // Hitelesített állapot ellenőrzése.
  isAuthenticated(): boolean {
    return this.hasValidToken();
  }

  // Felhasználói szerepkör lekérése.
  getRole(): RoleName | null {
    const user = this.getUser();
    return user?.role || null;
  }

  // Lokálisan mentett felhasználói adatok frissítése profil mentés után.
  updateStoredUser(user: UserDto): void {
    const hasLocalToken = localStorage.getItem(this.tokenKey) !== null;
    const hasSessionToken = sessionStorage.getItem(this.tokenKey) !== null;

    if (hasLocalToken) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
    if (hasSessionToken) {
      sessionStorage.setItem(this.userKey, JSON.stringify(user));
    }

    if (!hasLocalToken && !hasSessionToken) {
      sessionStorage.setItem(this.userKey, JSON.stringify(user));
    }

    this.currentUserSubject.next(user);
  }

  // Token lejárati időzítő beállítása.
  private setupTokenExpirationTimer(token: string): void {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return;
      }

      const expiresAt = decoded.exp * 1000; // Lejárat ezredmásodpercben.
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      if (timeUntilExpiry <= 0) {
        this.logout();
        return;
      }

      // Automatikus kijelentkeztetés token lejáratkor.
      this.clearTokenExpirationTimer();
      this.tokenExpirationTimer = setTimeout(() => {
        console.warn('Token expired. Logging out...');
        this.logout();
      }, timeUntilExpiry);
    } catch (error) {
      console.error('Error setting up token expiration timer:', error);
    }
  }

  // Token lejárati időzítő törlése.
  private clearTokenExpirationTimer(): void {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }
  }

  // JWT token dekódolása egyszerű base64 módszerrel.
  private decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const decoded = atob(parts[1]);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  // Token és felhasználó mentése localStorage-be.
  private storeAuthData(token: string, user: UserDto, remember: boolean): void {
    this.clearAuthData();
    const storage = this.getTargetStorage(remember);
    storage.setItem(this.tokenKey, token);
    storage.setItem(this.userKey, JSON.stringify(user));
  }

  // Auth adatok törlése a localStorage-ből.
  private clearAuthData(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
  }

  // Felhasználó beolvasása a localStorage-ből.
  private getUserFromStorage(): UserDto | null {
    try {
      const userJson = this.getFromStorage(this.userKey);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  }

  // Token létezésének és érvényességének ellenőrzése.
  private hasValidToken(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return false;
      }

      const expiresAt = decoded.exp * 1000;
      return Date.now() < expiresAt;
    } catch (error) {
      return false;
    }
  }

  // Tároló kiválasztása emlékezzen rám alapján.
  private getTargetStorage(remember: boolean): Storage {
    return remember ? localStorage : sessionStorage;
  }

  // Érték olvasása bármelyik auth tárolóból.
  private getFromStorage(key: string): string | null {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  }

  // Induláskori auth állapot helyreállítása.
  private initializeAuthState(): void {
    const token = this.getToken();
    const user = this.getUserFromStorage();

    if (!token || !user || !this.hasValidToken()) {
      this.clearAuthData();
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      return;
    }

    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
    this.setupTokenExpirationTimer(token);
  }
}
