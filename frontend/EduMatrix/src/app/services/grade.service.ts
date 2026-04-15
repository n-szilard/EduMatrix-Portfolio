import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface GradeItemDto {
  id: string;
  grade: number;
  date: string; // YYYY-MM-DD
  subject: {
    id: string | null;
    name: string;
  };
  class: {
    id: string | null;
    name: string | null;
  };
}

@Injectable({
  providedIn: 'root',
})
export class GradeService {
  private readonly apiBaseUrl = 'http://localhost:4000/api';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private authHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  getMyGrades(): Observable<GradeItemDto[]> {
    return this.http.get<GradeItemDto[]>(`${this.apiBaseUrl}/grades/me`, {
      headers: this.authHeaders(),
    });
  }
}
