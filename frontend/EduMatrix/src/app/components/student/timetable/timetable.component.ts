import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ButtonModule } from 'primeng/button';

import { DayOfWeek, TimetableDto, TimetableService } from '../../../services/timetable.service';

interface TimetableRow extends TimetableDto {
  className: string;
  subjectName: string;
  teacherName: string;
  roomNumber: string;
}

interface GridCell {
  day: DayOfWeek;
  lessonNumber: number;
  entries: TimetableRow[];
}

@Component({
  selector: 'app-student-timetable',
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './timetable.component.html',
  styleUrl: './timetable.component.scss'
})
export class TimetableComponent implements OnInit {
  loading = false;
  loadError: string | null = null;
  rows: TimetableRow[] = [];
  isMobileView = false;
  mobileDayIndex = 0;

  readonly days: Array<{ label: string; value: DayOfWeek }> = [
    { label: 'Hétfő', value: 'Monday' },
    { label: 'Kedd', value: 'Tuesday' },
    { label: 'Szerda', value: 'Wednesday' },
    { label: 'Csütörtök', value: 'Thursday' },
    { label: 'Péntek', value: 'Friday' },
    { label: 'Szombat', value: 'Saturday' },
    { label: 'Vasárnap', value: 'Sunday' },
  ];

  readonly lessonNumbers = Array.from({ length: 10 }, (_, index) => index);

  constructor(private timetableService: TimetableService) {}

  async ngOnInit(): Promise<void> {
    this.updateViewport();
    this.setInitialMobileDay();
    await this.loadTimetable();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateViewport();
  }

  async reload(): Promise<void> {
    await this.loadTimetable();
  }

  get hasData(): boolean {
    return this.rows.length > 0;
  }

  get gridRows(): Array<{ lessonNumber: number; cells: GridCell[] }> {
    return this.lessonNumbers.map((lessonNumber) => ({
      lessonNumber,
      cells: this.days.map((day) => ({
        day: day.value,
        lessonNumber,
        entries: this.rows.filter((row) => row.day_of_week === day.value && row.lesson_number === lessonNumber),
      })),
    }));
  }

  get mobileDay(): DayOfWeek {
    return this.days[this.mobileDayIndex]?.value ?? 'Monday';
  }

  get mobileDayLabel(): string {
    return this.days[this.mobileDayIndex]?.label ?? 'Hétfő';
  }

  previousDay(): void {
    this.mobileDayIndex = (this.mobileDayIndex + this.days.length - 1) % this.days.length;
  }

  nextDay(): void {
    this.mobileDayIndex = (this.mobileDayIndex + 1) % this.days.length;
  }

  mobileEntries(lessonNumber: number): TimetableRow[] {
    return this.rows.filter(
      (row) => row.day_of_week === this.mobileDay && row.lesson_number === lessonNumber
    );
  }

  private updateViewport(): void {
    this.isMobileView = typeof window !== 'undefined' && window.innerWidth < 768;
  }

  private setInitialMobileDay(): void {
    const map = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = map[new Date().getDay()] as DayOfWeek;
    const index = this.days.findIndex((day) => day.value === today);
    this.mobileDayIndex = index >= 0 ? index : 0;
  }

  private async loadTimetable(): Promise<void> {
    this.loading = true;
    this.loadError = null;

    try {
      const data = await firstValueFrom(this.timetableService.getMyTimetable());
      this.rows = data.map((row) => ({
        ...row,
        className: row.ClassSubject?.Class?.name || row.ClassSubject?.class_id || 'Nincs osztály',
        subjectName: row.ClassSubject?.Subject?.name || 'Ismeretlen tantárgy',
        teacherName: row.ClassSubject?.Teacher?.User?.full_name || row.ClassSubject?.teacher_id || 'Nincs tanár',
        roomNumber: row.room_number || '-',
      }));
    } catch (error: any) {
      this.rows = [];
      this.loadError = error?.error?.message || 'Nem sikerült betölteni az órarendet.';
    } finally {
      this.loading = false;
    }
  }
}
