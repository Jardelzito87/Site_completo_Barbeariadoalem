/**
 * ==============================
 * COMPONENTE PRINCIPAL DA APLICAÇÃO
 * Componente raiz que contém o layout base
 * ==============================
 */

// Importações do Angular Core
import { Component } from '@angular/core';
// Importações do Angular Router para navegação
import { RouterLink, RouterOutlet } from '@angular/router';
// Serviço para controlar o modal de login
import { LoginModalService } from './services/login-modal.service';
// Componente do modal de login
import { LoginComponent } from './component/login/login.component';

/**
 * COMPONENTE RAIZ DA APLICAÇÃO
 * Responsável por:
 * - Renderizar o layout base (header, main, footer)
 * - Gerenciar a navegação entre páginas
 * - Controlar a abertura do modal de login administrativo
 */
@Component({
  selector: 'app-root', // Seletor usado no index.html
  standalone: true, // Componente standalone (não precisa de módulo)
  imports: [
    RouterOutlet, // Para renderizar componentes das rotas
    RouterLink, // Para navegação entre páginas
    LoginComponent // Modal de login sempre presente
  ],
  templateUrl: './app.component.html', // Template HTML do componente
  styleUrl: './app.component.css' // Estilos CSS do componente
})
export class AppComponent {
  /** Título da aplicação */
  title = 'barbearia-do-alem';
  
  /**
   * CONSTRUTOR
   * Injeta o serviço de controle do modal de login
   * @param loginModalService - Serviço para abrir/fechar modal de login
   */
  constructor(private loginModalService: LoginModalService) {}
  
  /**
   * ABRIR MODAL DE LOGIN ADMINISTRATIVO
   * Método chamado quando o usuário clica no link "Admin" do menu
   * Utiliza o serviço para abrir o modal de autenticação
   */
  openAdminLogin(): void {
    this.loginModalService.openModal();
  }
}
