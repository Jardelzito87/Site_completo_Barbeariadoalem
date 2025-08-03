import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DatabaseService, Agendamento, Servico, Cliente, DataBloqueada, LogAgendamento } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { GerenciarAdminsComponent } from '../gerenciar-admins/gerenciar-admins.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GerenciarAdminsComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  agendamentos: Agendamento[] = [];
  agendamentosFiltrados: Agendamento[] = [];
  servicos: Servico[] = [];
  clientes: Cliente[] = [];
  carregando = false;
  carregandoClientes = false;
  carregandoLogs = false;
  mensagem = '';
  mensagemTipo = '';
  bloqueioForm!: FormGroup;
  dataHoje: string;
  filtroAtual: string = 'pendentes';
  mostrarClientes = false;
  mostrarGerenciarAdmins = false;
  
  // Contadores de agendamentos por status
  contadorPendentes = 0;
  contadorConfirmados = 0;
  contadorFeitos = 0;
  contadorCancelados = 0;
  
  // Datas bloqueadas
  datasBloqueadas: DataBloqueada[] = [];
  
  // Logs de agendamentos
  logsAgendamentos: LogAgendamento[] = [];
  logsAgendamentosFiltrados: LogAgendamento[] = [];
  mostrarLogs = false;
  
  // Filtros de data para histórico
  filtroDataInicio: string = '';
  filtroDataFim: string = '';
  
  // Contador de cortes por período
  cortesHoje: number = 0;
  cortesAntecipados: number = 0; // Mudança: ao invés de "ontem", contar antecipados
  cortesSemanaPassada: number = 0; // Mudança: contar semana passada ao invés da atual
  cortesMes: number = 0;
  totalConcluidos: number = 0; // Novo contador para depuração
  totalCancelados: number = 0; // Novo contador para cancelados
  receitaEstimadaMes: number = 0;
  
  // Autenticação
  adminLogado: any = null;
  exibindoMenuUsuario = false;

  constructor(
    private dbService: DatabaseService, 
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Define a data de hoje no formato YYYY-MM-DD
    const hoje = new Date();
    this.dataHoje = hoje.toISOString().split('T')[0];
  }

  // Helper method to parse dates in local timezone without UTC conversion
  private parseLocalDate(dateString: string): Date {
    const dateParts = dateString.split('-');
    if (dateParts.length === 3) {
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
      const day = parseInt(dateParts[2]);
      return new Date(year, month, day);
    }
    // Fallback to regular Date constructor if format is unexpected
    return new Date(dateString);
  }

  ngOnInit(): void {
    this.adminLogado = this.authService.getAdminLogado();
    // Limpar dados antigos antes de carregar
    this.clientes = [];
    this.agendamentos = [];
    this.servicos = [];
    
    this.carregarServicos();
    this.carregarAgendamentos();
    this.carregarClientes();
    this.carregarDatasBloqueadas();
    this.carregarLogsAgendamentos();
    this.calcularContadorCortes();
    this.initForm();
  }
  
  carregarLogsAgendamentos(): void {
    this.carregandoLogs = true;
    this.dbService.getLogsAgendamentos().subscribe({
      next: (logs: LogAgendamento[]) => {
        this.logsAgendamentos = logs;
        this.logsAgendamentosFiltrados = [...logs]; // Inicializa com todos os logs
        console.log('Logs de agendamentos carregados:', this.logsAgendamentos.length);
        this.carregandoLogs = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar logs de agendamentos:', err);
        this.carregandoLogs = false;
        this.mensagem = 'Erro ao carregar histórico de alterações';
        this.mensagemTipo = 'erro';
      }
    });
  }
  
  carregarDatasBloqueadas(): void {
    this.dbService.getDatasBloqueadas().subscribe({
      next: (datas: DataBloqueada[]) => {
        this.datasBloqueadas = datas;
        console.log('Datas bloqueadas:', this.datasBloqueadas);
      },
      error: (err: any) => {
        console.error('Erro ao carregar datas bloqueadas:', err);
      }
    });
  }
  
  carregarClientes(): void {
    this.carregandoClientes = true;
    this.clientes = [];
    
    // Limpar qualquer cache local
    localStorage.removeItem('clientes');
    sessionStorage.removeItem('clientes');
    
    console.log('🔍 Fazendo requisição para:', `${this.dbService['apiUrl']}/clientes`);
    
    this.dbService.getClientes().subscribe({
      next: (data) => {
        this.clientes = data || [];
        console.log('=== DEBUG CLIENTES COMPLETO ===');
        console.log('URL da API:', `${this.dbService['apiUrl']}/clientes`);
        console.log('Dados brutos do backend:', data);
        console.log('Tipo dos dados:', typeof data);
        console.log('É array?', Array.isArray(data));
        console.log('Quantidade de clientes:', this.clientes.length);
        console.log('Primeiros 3 clientes:', this.clientes.slice(0, 3));
        console.log('=== FIM DEBUG ===');
        this.carregandoClientes = false;
      },
      error: (err) => {
        console.error('❌ Erro ao carregar clientes:', err);
        console.error('Status do erro:', err.status);
        console.error('URL que falhou:', err.url);
        this.clientes = [];
        this.carregandoClientes = false;
        this.mensagem = 'Erro ao carregar clientes do banco de dados';
        this.mensagemTipo = 'erro';
      }
    });
  }
  
  toggleMostrarClientes(): void {
    this.mostrarClientes = !this.mostrarClientes;
  }
  
  toggleMostrarLogs(): void {
    this.mostrarLogs = !this.mostrarLogs;
  }
  
  trackByClienteId(index: number, cliente: Cliente): number {
    return cliente.id || index;
  }
  
  recarregarClientes(): void {
    console.log('Forçando recarga de clientes...');
    this.carregarClientes();
  }
  


  initForm(): void {
    this.bloqueioForm = this.fb.group({
      data: ['', [Validators.required]],
      motivo: ['']
    });
  }

  carregarAgendamentos(): void {
    this.carregando = true;
    this.dbService.getAgendamentos().subscribe({
      next: (data) => {
        console.log('Agendamentos recebidos:', data);
        
        if (!data || data.length === 0) {
          console.log('Nenhum agendamento recebido');
          this.mensagem = 'Nenhum agendamento encontrado';
          this.mensagemTipo = 'erro';
          this.carregando = false;
          return;
        }
        
        // Forçar a conversão de tipos para garantir que todos os campos sejam reconhecidos
        const agendamentosConvertidos = data.map(agendamento => ({
          id: agendamento.id,
          cliente_id: agendamento.cliente_id,
          servico_id: agendamento.servico_id,
          data_agendada: agendamento.data_agendada,
          hora_agendada: agendamento.hora_agendada,
          observacoes: agendamento.observacoes || '',
          status: agendamento.status || 'pendente',
          cliente_nome: agendamento.cliente_nome || '',
          cliente_email: agendamento.cliente_email || '',
          cliente_telefone: agendamento.cliente_telefone || '',
          servico_nome: agendamento.servico_nome || '',
          servico_preco: agendamento.servico_preco || 0
        }));
        
        // Ordenar agendamentos por data e hora
        this.agendamentos = agendamentosConvertidos.sort((a, b) => {
          // Primeiro por status (pendentes primeiro)
          if (a.status === 'pendente' && b.status !== 'pendente') return -1;
          if (a.status !== 'pendente' && b.status === 'pendente') return 1;
          
          // Depois por data (mais recente primeiro) - fix timezone issue
          const dateA = this.parseLocalDate(a.data_agendada);
          const dateB = this.parseLocalDate(b.data_agendada);
          const dataComparacao = dateB.getTime() - dateA.getTime();
          if (dataComparacao !== 0) return dataComparacao;
          
          // Por último por hora (mais cedo primeiro)
          return a.hora_agendada.localeCompare(b.hora_agendada);
        });
        
        // Contar agendamentos por status
        this.contarAgendamentosPorStatus();
        
        // Calcular contadores de cortes (deve ser executado APÓS contarAgendamentosPorStatus)
        this.calcularContadorCortes();
        
        // Aplicar filtro atual
        this.aplicarFiltro(this.filtroAtual);
        
        console.log('Agendamentos processados:', this.agendamentos);
        this.carregando = false;
      },
      error: (err) => {
        console.error('Erro ao carregar agendamentos:', err);
        this.mensagem = 'Erro ao carregar agendamentos';
        this.mensagemTipo = 'erro';
        this.carregando = false;
      }
    });
  }
  
  aplicarFiltro(filtro: string): void {
    this.filtroAtual = filtro;
    console.log('Aplicando filtro:', filtro);
    console.log('Agendamentos disponíveis:', this.agendamentos);
    
    if (filtro === 'todos') {
      this.agendamentosFiltrados = [...this.agendamentos];
    } else {
      this.agendamentosFiltrados = this.agendamentos.filter(a => {
        if (filtro === 'pendentes') {
          return a.status === 'pendente';
        } else if (filtro === 'confirmados') {
          return a.status === 'confirmado';
        } else if (filtro === 'feitos') {
          return a.status === 'concluido';
        } else if (filtro === 'cancelados') {
          return a.status === 'cancelado' || a.status === 'não compareceu';
        }
        return true;
      });
    }
    
    console.log('Resultado do filtro:', this.agendamentosFiltrados);
  }

  carregarServicos(): void {
    this.dbService.getServicos().subscribe({
      next: (data) => {
        this.servicos = data;
      },
      error: (err) => {
        console.error('Erro ao carregar serviços:', err);
      }
    });
  }

  getNomeServico(servicoId: number): string {
    // Valores fixos para garantir que o nome seja exibido corretamente
    switch(servicoId) {
      case 1: return 'Corte Sobrenatural';
      case 2: return 'Degradê Espectral';
      case 3: return 'Navalha Demoníaca';
      case 4: return 'Barba Maldita';
      case 5: return 'Pacto Completo';
      case 6: return 'Transformação Sombria';
      default: return 'Serviço não encontrado';
    }
  }
  
  getPrecoServico(servicoId: number): number {
    // Valores fixos para garantir que o preço seja exibido corretamente
    switch(servicoId) {
      case 1: return 45.00;
      case 2: return 55.00;
      case 3: return 65.00;
      case 4: return 40.00;
      case 5: return 90.00;
      case 6: return 120.00;
      default: return 0;
    }
  }

  contarAgendamentosPorStatus(): void {
    this.contadorPendentes = this.agendamentos.filter(a => a.status === 'pendente').length;
    this.contadorConfirmados = this.agendamentos.filter(a => a.status === 'confirmado').length;
    this.contadorFeitos = this.agendamentos.filter(a => a.status === 'concluido').length;
    this.contadorCancelados = this.agendamentos.filter(a => a.status === 'cancelado' || a.status === 'não compareceu').length;
  }
  
  atualizarStatus(agendamento: Agendamento, novoStatus: string): void {
    this.carregando = true;
    console.log('🔄 Iniciando atualização de status...');
    console.log('📋 Dados:', { agendamentoId: agendamento.id, statusAtual: agendamento.status, novoStatus });
    
    // Verificar se tem token válido
    const token = localStorage.getItem('admin-token');
    if (!token) {
      console.error('❌ Token não encontrado');
      this.mensagem = 'Erro de autenticação. Faça login novamente.';
      this.mensagemTipo = 'erro';
      this.carregando = false;
      return;
    }
    
    // Atualizar no banco de dados
    this.dbService.atualizarStatusAgendamento(agendamento.id!, novoStatus).subscribe({
      next: (agendamentoAtualizado: Agendamento) => {
        console.log('✅ Status atualizado com sucesso:', agendamentoAtualizado);
        
        // Atualizar o agendamento na lista local
        const index = this.agendamentos.findIndex(a => a.id === agendamento.id);
        if (index !== -1) {
          this.agendamentos[index] = {
            ...agendamentoAtualizado,
            servico_nome: this.getNomeServico(agendamentoAtualizado.servico_id),
            servico_preco: this.getPrecoServico(agendamentoAtualizado.servico_id)
          };
          console.log('📝 Lista local atualizada');
        } else {
          console.warn('⚠️ Agendamento não encontrado na lista local');
        }
        
        // Atualizar contadores por status
        this.contarAgendamentosPorStatus();
        
        // Atualizar contadores de cortes (deve ser executado APÓS contarAgendamentosPorStatus)
        this.calcularContadorCortes();
        
        // Recarregar logs de agendamentos
        this.carregarLogsAgendamentos();
        
        this.mensagem = `Status atualizado para ${this.getStatusLabel(novoStatus)}`;
        this.mensagemTipo = 'sucesso';
        
        // Reaplicar o filtro atual
        this.aplicarFiltro(this.filtroAtual);
        
        this.carregando = false;
      },
      error: (err: any) => {
        console.error('❌ Erro ao atualizar status:', err);
        console.error('📊 Status HTTP:', err.status);
        console.error('📄 Mensagem:', err.error);
        
        if (err.status === 401) {
          this.mensagem = 'Sessão expirada. Faça login novamente.';
          this.authService.clearLocalData();
          this.router.navigate(['/login']);
        } else if (err.status === 400) {
          this.mensagem = `Erro: ${err.error.error || 'Status inválido'}`;
        } else {
          this.mensagem = `Erro ao atualizar status: ${err.error?.error || 'Erro interno'}`;
        }
        
        this.mensagemTipo = 'erro';
        this.carregando = false;
      }
    });
  }

  bloquearData(): void {
    if (this.bloqueioForm.invalid) {
      return;
    }

    const data = this.bloqueioForm.get('data')?.value;
    const motivo = this.bloqueioForm.get('motivo')?.value;

    this.carregando = true;
    this.dbService.bloquearData(data, motivo).subscribe({
      next: () => {
        this.mensagem = 'Data bloqueada com sucesso';
        this.mensagemTipo = 'sucesso';
        this.bloqueioForm.reset();
        this.carregarDatasBloqueadas(); // Recarregar datas bloqueadas
        this.carregando = false;
      },
      error: (err) => {
        console.error('Erro ao bloquear data:', err);
        this.mensagem = 'Erro ao bloquear data';
        this.mensagemTipo = 'erro';
        this.carregando = false;
      }
    });
  }
  
  desbloquearData(data: string): void {
    this.carregando = true;
    this.dbService.desbloquearData(data).subscribe({
      next: () => {
        this.mensagem = 'Data desbloqueada com sucesso';
        this.mensagemTipo = 'sucesso';
        this.carregarDatasBloqueadas(); // Recarregar datas bloqueadas
        this.carregando = false;
      },
      error: (err) => {
        console.error('Erro ao desbloquear data:', err);
        this.mensagem = 'Erro ao desbloquear data';
        this.mensagemTipo = 'erro';
        this.carregando = false;
      }
    });
  }

  formatarData(data: string): string {
    if (!data) return '';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  
  formatarHora(hora: string): string {
    // Converte formato 'HH:MM:SS' para 'HH:MM'
    return hora.substring(0, 5);
  }
  
  getStatusClass(status: string): string {
    switch(status) {
      case 'pendente': return 'status-pendente';
      case 'confirmado': return 'status-confirmado';
      case 'concluido': return 'status-concluido';
      case 'cancelado': return 'status-cancelado';
      case 'não compareceu': return 'status-nao-compareceu';
      default: return '';
    }
  }
  
  getStatusLabel(status: string): string {
    switch(status) {
      case 'pendente': return 'Pendente';
      case 'confirmado': return 'Confirmado';
      case 'concluido': return 'Concluído';
      case 'cancelado': return 'Cancelado';
      case 'não compareceu': return 'Não Compareceu';
      default: return status;
    }
  }
  
  // ============= MÉTODOS DE FILTROS DE DATA =============
  
  aplicarFiltroData(): void {
    let logsFiltrados = [...this.logsAgendamentos];
    
    // Filtrar por data de início
    if (this.filtroDataInicio) {
      const dataInicio = new Date(this.filtroDataInicio);
      logsFiltrados = logsFiltrados.filter(log => {
        const dataLog = new Date(log.criado_em);
        return dataLog >= dataInicio;
      });
    }
    
    // Filtrar por data de fim
    if (this.filtroDataFim) {
      const dataFim = new Date(this.filtroDataFim);
      // Adicionar 1 dia para incluir o dia inteiro
      dataFim.setDate(dataFim.getDate() + 1);
      logsFiltrados = logsFiltrados.filter(log => {
        const dataLog = new Date(log.criado_em);
        return dataLog < dataFim;
      });
    }
    
    this.logsAgendamentosFiltrados = logsFiltrados;
  }
  
  limparFiltroData(): void {
    this.filtroDataInicio = '';
    this.filtroDataFim = '';
    this.logsAgendamentosFiltrados = [...this.logsAgendamentos];
  }
  
  // ============= MÉTODOS DE CONTADOR DE CORTES =============
  
  calcularContadorCortes(): void {
    if (this.agendamentos.length === 0) return;
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Calcular semana passada
    const inicioSemanaPassada = new Date(hoje);
    const diaSemana = hoje.getDay();
    const diasParaSegundaPassada = diaSemana === 0 ? -13 : -6 - diaSemana; // 7 dias a mais para pegar semana anterior
    inicioSemanaPassada.setDate(hoje.getDate() + diasParaSegundaPassada);
    
    const fimSemanaPassada = new Date(inicioSemanaPassada);
    fimSemanaPassada.setDate(inicioSemanaPassada.getDate() + 6); // Domingo da semana passada
    
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    // Filtrar apenas agendamentos concluídos
    const cortesFeitos = this.agendamentos.filter(agendamento => 
      agendamento.status === 'concluido'
    );
    
    // Filtrar agendamentos cancelados (cancelado + não compareceu)
    const cortesCancelados = this.agendamentos.filter(agendamento => 
      agendamento.status === 'cancelado' || agendamento.status === 'não compareceu'
    );
    
    // Atualizar contador total para comparação
    this.totalConcluidos = cortesFeitos.length;
    this.totalCancelados = cortesCancelados.length;
    
    // Contar cortes por período - fix timezone issue
    this.cortesHoje = cortesFeitos.filter(corte => {
      const dataCorte = this.parseLocalDate(corte.data_agendada);
      dataCorte.setHours(0, 0, 0, 0);
      return dataCorte.getTime() === hoje.getTime();
    }).length;
    
    // NOVA LÓGICA: Contar agendamentos antecipados
    // Agendamentos concluídos cuja data original ainda não chegou
    this.cortesAntecipados = cortesFeitos.filter(corte => {
      const dataOriginal = this.parseLocalDate(corte.data_agendada);
      dataOriginal.setHours(0, 0, 0, 0);
      // Se a data original é no futuro mas já está concluído = foi antecipado
      return dataOriginal.getTime() > hoje.getTime();
    }).length;
    
    // NOVA LÓGICA: Contar cortes da semana passada - fix timezone issue
    this.cortesSemanaPassada = cortesFeitos.filter(corte => {
      const dataCorte = this.parseLocalDate(corte.data_agendada);
      dataCorte.setHours(0, 0, 0, 0);
      return dataCorte >= inicioSemanaPassada && dataCorte <= fimSemanaPassada;
    }).length;
    
    // CORREÇÃO: Para o contador do mês, considerar todos os agendamentos concluídos
    // independente da data original, já que alguns podem ter sido antecipados
    this.cortesMes = cortesFeitos.length; // Todos os cortes concluídos no período
    
    // Calcular receita estimada do mês baseada no total de cortes concluídos
    this.receitaEstimadaMes = this.cortesMes * 30;
  }
  
  // ============= MÉTODOS DE AUTENTICAÇÃO =============
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const userMenu = document.querySelector('.user-menu');
    
    if (userMenu && !userMenu.contains(target)) {
      this.exibindoMenuUsuario = false;
    }
  }
  
  toggleMenuUsuario(): void {
    this.exibindoMenuUsuario = !this.exibindoMenuUsuario;
  }
  
  logout(): void {
    this.carregando = true;
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/home']);
      },
      error: (error) => {
        console.error('Erro no logout:', error);
        // Mesmo com erro, fazer logout local
        this.authService.clearLocalData();
        this.router.navigate(['/home']);
      },
      complete: () => {
        this.carregando = false;
      }
    });
  }
}