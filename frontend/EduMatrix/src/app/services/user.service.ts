import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export type RoleName = 'admin' | 'teacher' | 'student' | 'parent' | 'pending';

export interface RoleDto {
  id: string;
  name: RoleName;
}

export interface TeacherDto {
  id: string;
  user_id: string;
  User?: {
    id: string;
    username: string;
    full_name: string;
    email: string;
  };
}

export interface UserDto {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: RoleName | null;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role: RoleName;
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  full_name?: string;
  password?: string;
  role?: RoleName;
}

export interface ActivatePendingPayload {
  role: 'student' | 'teacher';
  class_id?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateMyProfilePayload {
  username?: string;
  email?: string;
  full_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  // TODO: later move to environment.ts
  private readonly apiBaseUrl = 'http://localhost:4000/api';

  constructor(private http: HttpClient, private authService: AuthService) { }

  private authHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  getRoles(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[]>(`${this.apiBaseUrl}/users/roles`, {
      headers: this.authHeaders(),
    });
  }

  getUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.apiBaseUrl}/users`, {
      headers: this.authHeaders(),
    });
  }

  getTeachers(): Observable<TeacherDto[]> {
    return this.http.get<TeacherDto[]>(`${this.apiBaseUrl}/users/teachers`, {
      headers: this.authHeaders(),
    });
  }

  createUser(payload: CreateUserPayload): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.apiBaseUrl}/users`, payload, {
      headers: this.authHeaders(),
    });
  }

  updateUser(userId: string, payload: UpdateUserPayload): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.apiBaseUrl}/users/${encodeURIComponent(userId)}`, payload, {
      headers: this.authHeaders(),
    });
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/users/${encodeURIComponent(userId)}`, {
      headers: this.authHeaders(),
    });
  }

  activatePending(userId: string, payload: ActivatePendingPayload): Observable<{ message: string; userId: string; role: string }>
  {
    return this.http.put<{ message: string; userId: string; role: string }>(
      `${this.apiBaseUrl}/users/${encodeURIComponent(userId)}/activate`,
      payload,
      { headers: this.authHeaders() }
    );
  }

  changePassword(payload: ChangePasswordPayload): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.apiBaseUrl}/users/me/password`,
      payload,
      { headers: this.authHeaders() }
    );
  }

  updateMyProfile(payload: UpdateMyProfilePayload): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.apiBaseUrl}/users/me`, payload, {
      headers: this.authHeaders(),
    });
  }
}
