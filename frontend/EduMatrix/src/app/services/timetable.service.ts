import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { ClassSubjectDto } from './class-subject.service';

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface TimetableDto {
  id: string;
  class_subject_id: string;
  day_of_week: DayOfWeek;
  lesson_number: number;
  room_number: string;
  ClassSubject?: ClassSubjectDto;
}

export interface CreateTimetablePayload {
  class_subject_id: string;
  day_of_week: DayOfWeek;
  lesson_number: number;
  room_number: string;
}

export interface UpdateTimetablePayload {
  class_subject_id?: string;
  day_of_week?: DayOfWeek;
  lesson_number?: number;
  room_number?: string;
}

export interface TimetableQueryParams {
  class_subject_id?: string;
  day_of_week?: DayOfWeek;
  lesson_number?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TimetableService {
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

  getTimetables(params?: TimetableQueryParams): Observable<TimetableDto[]> {
    return this.http.get<TimetableDto[]>(`${this.apiBaseUrl}/timetables`, {
      headers: this.authHeaders(),
      params: params as Record<string, string | number | boolean>,
    });
  }

  getMyTimetable(): Observable<TimetableDto[]> {
    return this.http.get<TimetableDto[]>(`${this.apiBaseUrl}/timetables/me`, {
      headers: this.authHeaders(),
    });
  }

  createTimetable(payload: CreateTimetablePayload): Observable<TimetableDto> {
    return this.http.post<TimetableDto>(`${this.apiBaseUrl}/timetables`, payload, {
      headers: this.authHeaders(),
    });
  }

  updateTimetable(timetableId: string, payload: UpdateTimetablePayload): Observable<TimetableDto> {
    return this.http.patch<TimetableDto>(`${this.apiBaseUrl}/timetables/${encodeURIComponent(timetableId)}`, payload, {
      headers: this.authHeaders(),
    });
  }

  deleteTimetable(timetableId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/timetables/${encodeURIComponent(timetableId)}`, {
      headers: this.authHeaders(),
    });
  }
}
