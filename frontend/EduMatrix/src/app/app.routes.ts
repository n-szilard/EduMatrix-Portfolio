import { Routes } from '@angular/router';
import { LoginComponent } from './components/user/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { RegisterComponent } from './components/user/register/register.component';
import { LogoutComponent } from './components/user/logout/logout.component';
import { PendingComponent } from './components/system/pending/pending.component';
import { DashboardComponent } from './components/admin/dashboard/dashboard.component';
import { UsersComponent } from './components/admin/users/users.component';
import { NotfoundComponent } from './components/system/notfound/notfound.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'logout', component: LogoutComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'pending', component: PendingComponent },
    {
        path: 'admin',
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
            { path: 'dashboard', component: DashboardComponent },
            { path: 'users', component: UsersComponent },
        ],
    },
    { path: '**', component: NotfoundComponent },
];
