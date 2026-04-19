import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from 'chart.js';

// PrimeNG importok
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { AdminSidebarComponent } from '../layout/admin-sidebar/admin-sidebar.component';
import { AdminTopbarComponent } from '../layout/admin-topbar/admin-topbar.component';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { ClassService } from '../../../services/class.service';
import { SubjectService } from '../../../services/subject.service';
import { ClassSubjectService } from '../../../services/class-subject.service';
import { TimetableService } from '../../../services/timetable.service';

export interface ActivityLog {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  time: string;
}

export interface StatCard {
  label: string;
  value: string;
  icon: string;
  badgeLabel: string;
  badgeClass: string;
  subLabel: string;
}

export interface QuickAction {
  icon: string;
  label: string;
  routerLink: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
  RouterModule,
  AdminSidebarComponent,
  AdminTopbarComponent,
    ButtonModule,
    CardModule,
    AvatarModule,
    BadgeModule,
    ChipModule,
    DividerModule,
    InputTextModule,
    ScrollPanelModule,
    TagModule,
    TooltipModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('performanceCanvas') performanceCanvas?: ElementRef<HTMLCanvasElement>;

  private performanceChart?: Chart;
  private viewInitialized = false;
  adminName = signal<string>('Admin');

  navLinks = [
    { icon: 'pi pi-home', label: 'Vezérlőpult', routerLink: ['/admin/dashboard'] },
      { icon: 'pi pi-users', label: 'Felhasználók', routerLink: ['/admin/users'] },
    { icon: 'pi pi-sitemap', label: 'Osztályok', routerLink: ['/admin/classes'] },
    { icon: 'pi pi-book', label: 'Tantárgyak', routerLink: ['/admin/subjects'] },
    { icon: 'pi pi-table', label: 'Hozzárendelések', routerLink: ['/admin/class-subjects'] },
    { icon: 'pi pi-calendar', label: 'Órarend', routerLink: ['/admin/timetable'] },
  ];

  statCards: StatCard[] = [];

  activityLogs: ActivityLog[] = [];

  quickActions: QuickAction[] = [
    { icon: 'pi pi-user-plus', label: 'Felhasználó hozzáadása', routerLink: '/admin/users' },
    { icon: 'pi pi-sitemap', label: 'Osztályok kezelése', routerLink: '/admin/classes' },
    { icon: 'pi pi-table', label: 'Hozzárendelések', routerLink: '/admin/class-subjects' },
    { icon: 'pi pi-calendar', label: 'Órarend szerkesztése', routerLink: '/admin/timetable' },
  ];

  chartMonths = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
  chartSampleData = [0, 0, 0, 0, 0, 0, 0];
  chartHeadlineValue = '0';
  chartHeadlineLabel = 'órarendi bejegyzés összesen';
  chartDeltaLabel = 'Valós adatok alapján';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private classService: ClassService,
    private subjectService: SubjectService,
    private classSubjectService: ClassSubjectService,
    private timetableService: TimetableService,
  ) {
    Chart.register(
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      CategoryScale,
      Filler,
      Tooltip,
      Legend,
    );
  }

  ngOnInit(): void {
    this.loadAdminName();
    void this.loadDashboardData();
  }

  private loadAdminName(): void {
    try {
      const user = this.authService.getUser();
      if (user) {
        this.adminName.set(user.full_name || user.username || 'Admin');
      }
    } catch (error) {
      console.error('Hiba az admin név beolvasásakor:', error);
    }
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.initPerformanceChart();
  }

  private async loadDashboardData(): Promise<void> {
    try {
      const [users, classes, subjects, classSubjects, timetables] = await Promise.all([
        firstValueFrom(this.userService.getUsers()),
        firstValueFrom(this.classService.getClasses()),
        firstValueFrom(this.subjectService.getSubjects()),
        firstValueFrom(this.classSubjectService.getClassSubjects()),
        firstValueFrom(this.timetableService.getTimetables()),
      ]);

      const studentCount = users.filter((user) => user.role === 'student').length;
      const teacherCount = users.filter((user) => user.role === 'teacher').length;
      const pendingCount = users.filter((user) => user.role === 'pending').length;
      const totalUserCount = users.length;
      const todayLessons = timetables.filter((row) => row.day_of_week === this.currentDayOfWeek()).length;

      this.statCards = [
        {
          label: 'Összes tanuló',
          value: String(studentCount),
          icon: 'pi pi-users',
          badgeLabel: `${pendingCount} függő`,
          badgeClass: pendingCount > 0 ? 'badge-primary' : 'badge-success',
          subLabel: 'jóváhagyásra váró fiókok',
        },
        {
          label: 'Aktív tanárok',
          value: String(teacherCount),
          icon: 'pi pi-graduation-cap',
          badgeLabel: classes.length > 0 ? `${(teacherCount / classes.length).toFixed(1)}` : '0.0',
          badgeClass: 'badge-success',
          subLabel: 'tanár / osztály arány',
        },
        {
          label: 'Mai órák száma',
          value: String(todayLessons),
          icon: 'pi pi-check-circle',
          badgeLabel: this.dayLabelHu(this.currentDayOfWeek()),
          badgeClass: 'badge-primary',
          subLabel: 'aktuális napi terhelés',
        },
      ];

      this.activityLogs = [
        {
          icon: 'pi pi-users',
          iconBg: 'log-icon-success',
          iconColor: 'text-green-600',
          title: 'Felhasználók összesen',
          description: `${totalUserCount} regisztrált felhasználó (${studentCount} diák, ${teacherCount} tanár).`,
          time: 'Valós idejű összesítés',
        },
        {
          icon: 'pi pi-sitemap',
          iconBg: 'log-icon-primary',
          iconColor: 'text-primary',
          title: 'Osztályok és tantárgyak',
          description: `${classes.length} osztály, ${subjects.length} tantárgy és ${classSubjects.length} aktív hozzárendelés.`,
          time: 'Valós idejű összesítés',
        },
        {
          icon: 'pi pi-calendar',
          iconBg: 'log-icon-warning',
          iconColor: 'text-orange-500',
          title: 'Órarendi terhelés',
          description: `${timetables.length} órarendi bejegyzés van a rendszerben, ebből ma ${todayLessons} esedékes.`,
          time: 'Valós idejű összesítés',
        },
      ];

      this.chartSampleData = this.chartMonths.map((_, idx) => {
        const dayKey = this.dayOfWeekByIndex(idx);
        return timetables.filter((row) => row.day_of_week === dayKey).length;
      });
      this.chartHeadlineValue = String(timetables.length);
      this.chartHeadlineLabel = 'órarendi bejegyzés összesen';
      this.chartDeltaLabel = `${todayLessons} bejegyzés a mai napon`;

      if (this.viewInitialized) {
        this.initPerformanceChart();
      }
    } catch (error) {
      console.error('Dashboard betöltési hiba:', error);
      this.statCards = [];
      this.activityLogs = [];
      this.chartSampleData = [0, 0, 0, 0, 0, 0, 0];
      this.chartHeadlineValue = '0';
      this.chartHeadlineLabel = 'adat nem elérhető';
      this.chartDeltaLabel = 'A dashboard adatai nem tölthetők be';

      if (this.viewInitialized) {
        this.initPerformanceChart();
      }
    }
  }

  private dayOfWeekByIndex(index: number): 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' {
    const order: Array<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'> = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    return order[index] || 'Monday';
  }

  private currentDayOfWeek(): 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' {
    const map: Array<'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'> = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const day = map[new Date().getDay()];
    return day === 'Sunday' ? 'Sunday' : day;
  }

  private dayLabelHu(day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'): string {
    const labels: Record<typeof day, string> = {
      Monday: 'Hétfő',
      Tuesday: 'Kedd',
      Wednesday: 'Szerda',
      Thursday: 'Csütörtök',
      Friday: 'Péntek',
      Saturday: 'Szombat',
      Sunday: 'Vasárnap',
    };
    return labels[day];
  }

  private initPerformanceChart(): void {
    const canvas = this.performanceCanvas?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Gradient fill: felül enyhe kék, alul átlátszó (mint a képen)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: this.chartMonths,
        datasets: [
          {
            label: 'Átlag',
            data: this.chartSampleData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: gradient,
            fill: true,
            tension: 0.45,
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 0,
            clip: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        layout: {
          padding: { left: 4, right: 4, top: 6, bottom: 0 },
        },
        scales: {
          x: {
            display: false,
            grid: { display: false },
            border: { display: false },
          },
          y: {
            display: false,
            grid: { display: false },
            border: { display: false },
          },
        },
        animation: {
          duration: 600,
        },
      },
    };

    this.performanceChart?.destroy();
    this.performanceChart = new Chart(ctx, config);
  }
}
