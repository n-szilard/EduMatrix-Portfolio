import { Routes } from '@angular/router';
import { LoginComponent } from './components/user/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { RegisterComponent } from './components/user/register/register.component';
import { DashboardComponent } from './components/admin/dashboard/dashboard.component';
import { UsersComponent } from './components/admin/users/users.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    {
        path: 'admin',
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
            { path: 'dashboard', component: DashboardComponent },
            { path: 'users', component: UsersComponent },
        ],
    },

    // Backward compatible routes (optional)
    { path: 'dashboard', pathMatch: 'full', redirectTo: 'admin/dashboard' },
    { path: 'users', pathMatch: 'full', redirectTo: 'admin/users' },

];
