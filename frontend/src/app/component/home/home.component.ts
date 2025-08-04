/**
 * ==============================
 * COMPONENTE DA PÁGINA HOME
 * Página inicial da aplicação com apresentação da barbearia
 * ==============================
 */

// Importações do Angular Core
import { Component } from '@angular/core';
// Importações do Angular Router para navegação
import { Router, RouterModule } from '@angular/router';
// Serviço para gerenciar filtros da galeria
import { GaleriaService } from '../../services/galeria.service';

/**
 * COMPONENTE HOME
 * Responsável por:
 * - Exibir apresentação da barbearia
 * - Mostrar serviços em destaque
 * - Exibir tabela de preços
 * - Permitir navegação para galeria com filtro pré-selecionado
 */
@Component({
  selector: 'app-home', // Seletor do componente
  standalone: true, // Componente standalone
  imports: [RouterModule], // Módulos necessários (RouterModule para links de navegação)
  templateUrl: './home.component.html', // Template HTML
  styleUrl: './home.component.css' // Estilos CSS
})
export class HomeComponent {
  /**
   * CONSTRUTOR
   * Injeta dependências necessárias
   * @param router - Serviço de navegação do Angular
   * @param galeriaService - Serviço para gerenciar filtros da galeria
   */
  constructor(private router: Router, private galeriaService: GaleriaService) {}
  
  /**
   * NAVEGAR PARA GALERIA COM FILTRO
   * Método chamado quando usuário clica em um serviço em destaque
   * Define um filtro na galeria e navega para a página de galeria
   * @param titulo - Título do serviço para filtrar na galeria
   */
  navegarParaGaleria(titulo: string): void {
    // Define o serviço selecionado no serviço da galeria
    this.galeriaService.setServicoSelecionado(titulo);
    // Navega para a página da galeria
    this.router.navigate(['/galeria-fotos']);
  }
}
