import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { HeaderComponent } from "../system/header/header.component";
import { FooterComponent } from '../system/footer/footer.component';

@Component({
  selector: 'app-home',
  imports: [ButtonModule, CardModule, HeaderComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

}
