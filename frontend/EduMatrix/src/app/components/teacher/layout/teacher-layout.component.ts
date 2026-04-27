import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { TeacherNavbarComponent } from '../teacher-navbar/teacher-navbar.component';

@Component({
  selector: 'app-teacher-layout',
  standalone: true,
  imports: [RouterOutlet, TeacherNavbarComponent],
  templateUrl: './teacher-layout.component.html',
  styleUrl: './teacher-layout.component.scss',
})
export class TeacherLayoutComponent {}
