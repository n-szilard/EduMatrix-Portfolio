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
  gridRows: Array<{ lessonNumber: number; cells: GridCell[] }> = [];
  private entriesByDayAndLesson = new Map<string, TimetableRow[]>();

  readonly days: Array<{ label: string; value: DayOfWeek }> = [
    { label: 'Hétfő', value: 'Monday' },
    { label: 'Kedd', value: 'Tuesday' },
    { label: 'Szerda', value: 'Wednesday' },
    { label: 'Csütörtök', value: 'Thursday' },
    { label: 'Péntek', value: 'Friday' },
    { label: 'Szombat', value: 'Saturday' },
    { label: 'Vasárnap', value: 'Sunday' },
  ];
  visibleDays: Array<{ label: string; value: DayOfWeek }> = this.days.filter(
    (day) => day.value !== 'Saturday' && day.value !== 'Sunday'
  );

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

  get mobileDay(): DayOfWeek {
    return this.visibleDays[this.mobileDayIndex]?.value ?? 'Monday';
  }

  get mobileDayLabel(): string {
    return this.visibleDays[this.mobileDayIndex]?.label ?? 'Hétfő';
  }

  previousDay(): void {
    this.mobileDayIndex = (this.mobileDayIndex + this.visibleDays.length - 1) % this.visibleDays.length;
  }

  nextDay(): void {
    this.mobileDayIndex = (this.mobileDayIndex + 1) % this.visibleDays.length;
  }

  mobileEntries(lessonNumber: number): TimetableRow[] {
    return this.entriesByDayAndLesson.get(this.getEntryKey(this.mobileDay, lessonNumber)) ?? [];
  }

  private updateViewport(): void {
    this.isMobileView = typeof window !== 'undefined' && window.innerWidth < 768;
  }

  private setInitialMobileDay(): void {
    const map = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = map[new Date().getDay()] as DayOfWeek;
    const index = this.visibleDays.findIndex((day) => day.value === today);
    this.mobileDayIndex = index >= 0 ? index : 0;
  }

  private getEntryKey(day: DayOfWeek, lessonNumber: number): string {
    return `${day}|${lessonNumber}`;
  }

  private rebuildGridData(): void {
    const grouped = new Map<string, TimetableRow[]>();
    const selectedDay = this.visibleDays[this.mobileDayIndex]?.value ?? 'Monday';

    for (const row of this.rows) {
      const key = this.getEntryKey(row.day_of_week, row.lesson_number);
      const bucket = grouped.get(key);
      if (bucket) {
        bucket.push(row);
      } else {
        grouped.set(key, [row]);
      }
    }

    const saturdayHasEntries = this.rows.some((row) => row.day_of_week === 'Saturday');
    const sundayHasEntries = this.rows.some((row) => row.day_of_week === 'Sunday');

    this.visibleDays = this.days.filter((day) => {
      if (day.value === 'Saturday') return saturdayHasEntries;
      if (day.value === 'Sunday') return sundayHasEntries;
      return true;
    });

    const nextMobileIndex = this.visibleDays.findIndex((day) => day.value === selectedDay);
    this.mobileDayIndex = nextMobileIndex >= 0 ? nextMobileIndex : 0;

    this.entriesByDayAndLesson = grouped;
    this.gridRows = this.lessonNumbers.map((lessonNumber) => ({
      lessonNumber,
      cells: this.visibleDays.map((day) => ({
        day: day.value,
        lessonNumber,
        entries: grouped.get(this.getEntryKey(day.value, lessonNumber)) ?? [],
      })),
    }));
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
      this.rebuildGridData();
    } catch (error: any) {
      this.rows = [];
      this.loadError = error?.error?.message || 'Nem sikerült betölteni az órarendet.';
      this.rebuildGridData();
    } finally {
      this.loading = false;
    }
  }
}
