import { Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

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
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
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
export class DashboardComponent implements OnInit {
  @ViewChild('performanceCanvas') performanceCanvas?: ElementRef<HTMLCanvasElement>;

  private performanceChart?: Chart;
  adminName = signal<string>('Admin');

  navLinks = [
  { icon: 'pi pi-home', label: 'Vezérlőpult', routerLink: ['/admin/dashboard'] },
  { icon: 'pi pi-users', label: 'Felhasználók', routerLink: ['/admin/users'] },
  { icon: 'pi pi-sitemap', label: 'Osztályok', routerLink: ['/admin/classes'] },
  // később: { icon: 'pi pi-calendar', label: 'Órarend', routerLink: ['/admin/schedule'] },
  ];

  statCards: StatCard[] = [
    {
      label: 'Összes tanuló',
      value: '1 240',
      icon: 'pi pi-users',
      badgeLabel: '+12%',
      badgeClass: 'badge-success',
      subLabel: 'előző hónaphoz képest',
    },
    {
      label: 'Aktív tanárok',
      value: '85',
      icon: 'pi pi-graduation-cap',
      badgeLabel: '+2%',
      badgeClass: 'badge-success',
      subLabel: 'szolgálatban',
    },
    {
      label: 'Jelenlét arány',
      value: '94.2%',
      icon: 'pi pi-check-circle',
      badgeLabel: 'Ma',
      badgeClass: 'badge-primary',
      subLabel: 'Átlagnak megfelelő.',
    },
  ];

  activityLogs: ActivityLog[] = [
    {
      icon: 'pi pi-user-plus',
      iconBg: 'log-icon-success',
      iconColor: 'text-green-600',
      title: 'Új tanuló regisztrált',
      description: '"Kiss Anna" beiratkozott a 10.B osztályba',
      time: '10 perce',
    },
    {
      icon: 'pi pi-file-edit',
      iconBg: 'log-icon-primary',
      iconColor: 'text-primary',
      title: 'Órarend módosítva',
      description: 'Kémia labor B átkerült a 204-es terembe',
      time: '2 órája',
    },
    {
      icon: 'pi pi-chart-bar',
      iconBg: 'log-icon-warning',
      iconColor: 'text-orange-500',
      title: 'Jelentés elkészült',
      description: 'Havi pénzügyi összesítő elérhető',
      time: '5 órája',
    },
    {
      icon: 'pi pi-shield',
      iconBg: 'log-icon-danger',
      iconColor: 'text-red-500',
      title: 'Admin bejelentkezés',
      description: 'Biztonságos bejelentkezés: 192.168.1.45',
      time: '8 órája',
    },
  ];

  quickActions: QuickAction[] = [
    { icon: 'pi pi-user-plus', label: 'Tanuló hozzáadása' },
    { icon: 'pi pi-upload', label: 'Jegyek feltöltése' },
    { icon: 'pi pi-envelope', label: 'Szülők értesítése' },
    { icon: 'pi pi-pencil', label: 'Dolgozat kiosztása' },
  ];

  chartMonths = ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún'];

  // Minta adatsor (6 hónap) – a képen látható hullámzáshoz hasonló
  chartSampleData = [3.1, 3.35, 3.05, 3.3, 3.55, 3.2];

  constructor() {
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
  }

  private loadAdminName(): void {
    try {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        this.adminName.set(user.full_name || user.username || 'Admin');
      }
    } catch (error) {
      console.error('Hiba az admin név beolvasásakor:', error);
    }
  }

  ngAfterViewInit(): void {
    this.initPerformanceChart();
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
