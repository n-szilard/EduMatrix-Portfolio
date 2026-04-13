import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface ClassDto {
  id: string;
  name: string;
}

export interface StudentDto {
  id: string;
  user_id: string;
  class_id: string | null;
  User?: {
    id: string;
    full_name: string;
    username: string;
    email: string;
  };
}

export interface CreateClassPayload {
  name: string;
}

export interface RenameClassPayload {
  name: string;
}

export interface EnrollStudentPayload {
  student_id?: string;
  studentId?: string;
}

export interface EnrollResponse {
  message: string;
  student: StudentDto;
}

@Injectable({
  providedIn: 'root'
})
export class ClassService {

  // Backend API alap URL
  private readonly apiBaseUrl = 'http://localhost:4000/api';

  constructor(private http: HttpClient, private authService: AuthService) { }

  // Auth fejléc tokennel
  private authHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // Összes osztály
  getClasses(): Observable<ClassDto[]> {
    return this.http.get<ClassDto[]>(`${this.apiBaseUrl}/classes`, {
      headers: this.authHeaders(),
    });
  }

  // Egy osztály adatai
  getClassById(classId: string): Observable<ClassDto> {
    return this.http.get<ClassDto>(`${this.apiBaseUrl}/classes/${encodeURIComponent(classId)}`, {
      headers: this.authHeaders(),
    });
  }

  // Új osztály létrehozása
  createClass(payload: CreateClassPayload): Observable<ClassDto> {
    return this.http.post<ClassDto>(`${this.apiBaseUrl}/classes`, payload, {
      headers: this.authHeaders(),
    });
  }

  // Osztály átnevezése
  renameClass(classId: string, payload: RenameClassPayload): Observable<ClassDto> {
    return this.http.put<ClassDto>(`${this.apiBaseUrl}/classes/${encodeURIComponent(classId)}`, payload, {
      headers: this.authHeaders(),
    });
  }

  // Üres osztály törlése
  deleteClass(classId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/classes/${encodeURIComponent(classId)}`, {
      headers: this.authHeaders(),
    });
  }

  // Osztály diákjai
  getClassStudents(classId: string): Observable<StudentDto[]> {
    return this.http.get<StudentDto[]>(`${this.apiBaseUrl}/classes/${encodeURIComponent(classId)}/students`, {
      headers: this.authHeaders(),
    });
  }

  // Osztály nélküli diákok
  getFreeStudents(): Observable<StudentDto[]> {
    return this.http.get<StudentDto[]>(`${this.apiBaseUrl}/classes/students/free`, {
      headers: this.authHeaders(),
    });
  }

  // Diák hozzárendelése
  enrollStudent(classId: string, payload: EnrollStudentPayload): Observable<EnrollResponse> {
    return this.http.post<EnrollResponse>(`${this.apiBaseUrl}/classes/${encodeURIComponent(classId)}/enroll`, payload, {
      headers: this.authHeaders(),
    });
  }

  // Diák áthelyezése
  moveStudentToClass(classId: string, studentId: string): Observable<EnrollResponse> {
    return this.http.put<EnrollResponse>(
      `${this.apiBaseUrl}/classes/${encodeURIComponent(classId)}/enroll/${encodeURIComponent(studentId)}`,
      {},
      { headers: this.authHeaders() }
    );
  }

  // Diák kivétele osztályból
  removeStudentFromClass(classId: string, studentId: string): Observable<EnrollResponse> {
    return this.http.delete<EnrollResponse>(
      `${this.apiBaseUrl}/classes/${encodeURIComponent(classId)}/enroll/${encodeURIComponent(studentId)}`,
      { headers: this.authHeaders() }
    );
  }
}
