import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { StudentNavbarComponent } from '../student-navbar/student-navbar.component';

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [RouterOutlet, StudentNavbarComponent],
  templateUrl: './student-layout.component.html',
  styleUrl: './student-layout.component.scss',
})
export class StudentLayoutComponent {}