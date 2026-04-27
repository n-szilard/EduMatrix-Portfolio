import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthService } from './auth.service';

export interface DayLessonDto {
  timetable_id: string;
  class_subject_id: string;
  lesson_number: number;
  day_of_week: string;
  room_number: string;
  class_name: string | null;
  subject_name: string;
}

export interface TeacherAbsenceDto {
  id: string;
  date: string;
  justified: boolean;
  student_id: string;
  student_name: string;
  class_subject_id: string;
  subject_name: string;
  class_name: string;
}

export interface MarkAbsencePayload {
  student_id: string;
  date: string;
  timetable_ids: string[];
}

export interface MarkAbsenceResponse {
  message: string;
  created_count: number;
  skipped_count: number;
  items: TeacherAbsenceDto[];
}

export interface TeacherAbsenceQuery {
  class_id?: string;
  student_id?: string;
  date?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AbsenceService {
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

  getDayLessons(classId: string, date: string): Observable<DayLessonDto[]> {
    const params = new HttpParams().set('class_id', classId).set('date', date);
    return this.http.get<DayLessonDto[]>(`${this.apiBaseUrl}/absences/day-lessons`, {
      headers: this.authHeaders(),
      params,
    });
  }

  getTeacherAbsences(query: TeacherAbsenceQuery = {}): Observable<TeacherAbsenceDto[]> {
    let params = new HttpParams();
    if (query.class_id) params = params.set('class_id', query.class_id);
    if (query.student_id) params = params.set('student_id', query.student_id);
    if (query.date) params = params.set('date', query.date);

    return this.http.get<TeacherAbsenceDto[]>(`${this.apiBaseUrl}/absences/teacher`, {
      headers: this.authHeaders(),
      params,
    });
  }

  markAbsences(payload: MarkAbsencePayload): Observable<MarkAbsenceResponse> {
    return this.http.post<MarkAbsenceResponse>(`${this.apiBaseUrl}/absences/mark`, payload, {
      headers: this.authHeaders(),
    });
  }
}