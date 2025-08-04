/**
 * ==============================
 * ARQUIVO PRINCIPAL DA APLICAÇÃO ANGULAR
 * Ponto de entrada que inicializa a aplicação
 * ==============================
 */

// Importações necessárias para inicializar a aplicação Angular
import { bootstrapApplication } from '@angular/platform-browser'; // Função para inicializar aplicação standalone
import { appConfig } from './app/app.config'; // Configurações da aplicação (providers, rotas, etc.)
import { AppComponent } from './app/app.component'; // Componente raiz da aplicação

/**
 * INICIALIZAÇÃO DA APLICAÇÃO
 * Bootstraps a aplicação Angular usando o padrão standalone
 * - AppComponent: Componente raiz que será renderizado
 * - appConfig: Configurações de providers, rotas e interceptors
 */
bootstrapApplication(AppComponent, appConfig)
  .catch((err: any) => console.error(err)); // Captura e exibe erros de inicialização
