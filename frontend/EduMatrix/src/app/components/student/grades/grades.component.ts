import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';

import { GradeService, GradeItemDto, GradeSubjectDto } from '../../../services/grade.service';

interface UiGrade {
  value: number;
  dateLabel: string;
  isoDate: string;
  month: string;
}

interface UiSubject {
  name: string;
  grades: UiGrade[];
}

@Component({
  selector: 'app-grades',
  imports: [CommonModule, CardModule, TagModule, DividerModule, TooltipModule],
  templateUrl: './grades.component.html',
  styleUrl: './grades.component.scss'
})
export class GradesComponent implements OnInit {
  subjects: UiSubject[] = [];
  className: string | null = null;

  constructor(private gradeService: GradeService) {}

  async ngOnInit(): Promise<void> {
    const [gradesResult, subjectsResult] = await Promise.allSettled([
      firstValueFrom(this.gradeService.getMyGrades()),
      firstValueFrom(this.gradeService.getMyGradeSubjects()),
    ]);

    const items = gradesResult.status === 'fulfilled' ? gradesResult.value : [];
    const subjectRows = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];

    this.setUiData(items, subjectRows);
  }

  private setUiData(items: GradeItemDto[], subjectRows: GradeSubjectDto[]): void {
    this.className = items.find((x) => x.class?.name)?.class?.name ?? subjectRows.find((x) => x.class?.name)?.class?.name ?? null;

    const map = new Map<string, UiGrade[]>();
    for (const subjectRow of subjectRows) {
      const subjectName = subjectRow.subject?.name ?? 'Ismeretlen tantárgy';
      if (!map.has(subjectName)) {
        map.set(subjectName, []);
      }
    }

    for (const it of items) {
      const subjectName = it.subject?.name ?? 'Ismeretlen tantárgy';
      const list = map.get(subjectName) ?? [];
      list.push({
        value: Math.round(Number(it.grade)),
        isoDate: it.date,
        dateLabel: this.formatShortDateHu(it.date),
        month: this.monthNameHu(it.date),
      });
      map.set(subjectName, list);
    }

    this.subjects = [...map.entries()]
      .map(([name, grades]) => ({
        name,
        grades: grades.sort((a, b) => (a.isoDate < b.isoDate ? 1 : -1)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  hasGrades(grades: UiGrade[]): boolean {
    return grades.length > 0;
  }

  getMonths(grades: UiGrade[]): string[] {
    const order = ['Szeptember','Október','November','December','Január','Február','Március','Április','Május','Június'];
    const unique = [...new Set(grades.map(g => g.month))];
    return unique.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }

  getByMonth(grades: UiGrade[], month: string): UiGrade[] {
    return grades.filter(g => g.month === month);
  }

  getAverage(grades: UiGrade[]): number {
    if (!grades.length) return 0;
    return grades.reduce((s, g) => s + g.value, 0) / grades.length;
  }

  gradeColor(v: number): string {
    return ['', 'danger', 'danger', 'warning', 'info', 'success'][v] ?? 'info';
  }

  avgColor(avg: number): string {
    if (avg >= 4.5) return 'success';
    if (avg >= 3.5) return 'info';
    if (avg >= 2.5) return 'warning';
    return 'danger';
  }

  private monthNameHu(isoDate: string): string {
    // YYYY-MM-DD
    const month = Number(isoDate.split('-')[1] ?? 0);
    const names = [
      '',
      'Január',
      'Február',
      'Március',
      'Április',
      'Május',
      'Június',
      'Július',
      'Augusztus',
      'Szeptember',
      'Október',
      'November',
      'December',
    ];
    return names[month] ?? '';
  }

  private formatShortDateHu(isoDate: string): string {
    const [y, m, d] = isoDate.split('-').map((x) => Number(x));
    if (!y || !m || !d) return isoDate;
    const months = ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'];
    return `${months[m - 1]} ${d}.`;
  }
}