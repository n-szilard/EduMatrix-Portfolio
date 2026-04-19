import { Routes } from '@angular/router';
import { LoginComponent } from './components/user/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { RegisterComponent } from './components/user/register/register.component';
import { LogoutComponent } from './components/user/logout/logout.component';
import { PendingComponent } from './components/system/pending/pending.component';
import { DashboardComponent } from './components/admin/dashboard/dashboard.component';
import { UsersComponent } from './components/admin/users/users.component';
import { NotfoundComponent } from './components/system/notfound/notfound.component';
import { ClassesComponent } from './components/admin/classes/classes.component';
import { SubjectsComponent } from './components/admin/subjects/subjects.component';
import { ClassSubjectsComponent } from './components/admin/class-subjects/class-subjects.component';
import { TimetableComponent } from './components/admin/timetable/timetable.component';
import { authGuard, roleGuard } from './guards/auth.guard';
import { ProfileComponent } from './components/user/profile/profile.component';
import { StudentDashboardComponent } from './components/student/student-dashboard/student-dashboard.component';
import { GradesComponent } from './components/student/grades/grades.component';
import { NotesComponent } from './components/teacher/notes/notes.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'logout', component: LogoutComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'pending', component: PendingComponent, canActivate: [authGuard] },
    { path: 'profile', component: ProfileComponent },
    


    {
        path: 'admin',
        canActivate: [roleGuard(['admin'])],
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
            { path: 'dashboard', component: DashboardComponent },
            { path: 'users', component: UsersComponent },
            { path: 'classes', component: ClassesComponent },
            { path: 'subjects', component: SubjectsComponent },
            { path: 'class-subjects', component: ClassSubjectsComponent },
            { path: 'timetable', component: TimetableComponent },
        ],
    },
    {
        path: 'student',
        canActivate: [roleGuard(['student', 'admin'])],
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
            { path: 'dashboard', component: StudentDashboardComponent },
            { path: 'grades', component: GradesComponent },
            { path: 'notes', component: NotesComponent },

        ],
    },
    {
        path: 'teacher',
        canActivate: [roleGuard(['teacher', 'admin'])],
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
            { path: 'dashboard', component: StudentDashboardComponent },
            { path: 'grades', component: GradesComponent },
            { path: 'notes', component: NotesComponent },

        ],
    },
    { path: '**', component: NotfoundComponent },
];
