import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { LoginModalService } from './services/login-modal.service';
import { LoginComponent } from './component/login/login.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    LoginComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'barbearia-do-alem';
  
  constructor(private loginModalService: LoginModalService) {}
  
  openAdminLogin(): void {
    this.loginModalService.openModal();
  }
}
