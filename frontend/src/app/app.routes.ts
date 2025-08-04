/**
 * ==============================
 * CONFIGURAÇÃO DE ROTAS DA APLICAÇÃO
 * Define todas as rotas e seus componentes correspondentes
 * ==============================
 */

// Importação do tipo Routes do Angular Router
import { Routes } from '@angular/router';

// Importações dos componentes das páginas
import { HomeComponent } from './component/home/home.component'; // Página inicial
import { QuemSomosComponent } from './component/quem-somos/quem-somos.component'; // Página sobre a empresa
import { GaleriaFotosComponent } from './component/galeria-fotos/galeria-fotos.component'; // Galeria de trabalhos
import { AgendamentoComponent } from './component/agendamento/agendamento.component'; // Formulário de agendamento
import { ContatoComponent } from './component/contato/contato.component'; // Informações de contato
import { AdminComponent } from './component/admin/admin.component'; // Painel administrativo
import { LoginComponent } from './component/login/login.component'; // Modal de login (não usado como rota)
import { NaoEncontradosComponent } from './component/nao-encontrados/nao-encontrados.component'; // Página 404

// Importação do guard de autenticação
import { AuthGuard } from './guards/auth.guard'; // Proteção de rotas administrativas

/**
 * CONFIGURAÇÃO DAS ROTAS
 * Array que define todas as rotas da aplicação e seus componentes
 * Ordem importa: rotas mais específicas devem vir antes das genéricas
 */
export const routes: Routes = [
    // ROTA RAIZ - Redireciona para a página inicial
    {path:'', component: HomeComponent},
    
    // ROTAS PÚBLICAS - Acessíveis a todos os usuários
    {path:'home', component: HomeComponent}, // Página inicial com apresentação
    {path:'quem-somos', component: QuemSomosComponent}, // História e informações da barbearia
    {path:'galeria-fotos', component: GaleriaFotosComponent}, // Galeria de fotos dos trabalhos
    {path:'agendamento', component: AgendamentoComponent}, // Formulário para agendar serviços
    {path:'contato', component: ContatoComponent}, // Informações de contato e localização
    
    // ROTAS PROTEGIDAS - Requerem autenticação
    {path:'admin', component: AdminComponent, canActivate: [AuthGuard]}, // Painel administrativo protegido por AuthGuard

    // ROTA WILDCARD - Deve ser sempre a última
    {path:'**', component: NaoEncontradosComponent} // Página 404 para rotas não encontradas
];
