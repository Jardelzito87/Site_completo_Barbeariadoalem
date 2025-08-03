import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Servico, Cliente, Agendamento, DataBloqueada, LogAgendamento } from './database.service';

// Interface para simular o armazenamento persistente
// Using DataBloqueada interface from database.service.ts

interface MockStorage {
  servicos: Servico[];
  clientes: Cliente[];
  agendamentos: Agendamento[];
  datas_bloqueadas: DataBloqueada[];
  logs_agendamentos: LogAgendamento[];
}

@Injectable({
  providedIn: 'root'
})
export class MockDatabaseService {
  // Mock data
  private storage: MockStorage;
  private nextClienteId: number;
  private nextAgendamentoId: number;

  constructor() {
    // Limpar localStorage para resolver problemas de dados corrompidos
    localStorage.removeItem('barbeariaDoAlemData');
    
    // Inicializar com dados padrão
    this.storage = {
      servicos: [
        { id: 1, nome: 'Corte Sobrenatural', descricao: 'Transformação completa com técnicas ancestrais. Inclui ritual de purificação capilar', preco: 45.00 },
        { id: 2, nome: 'Degradê Espectral', descricao: 'Fade perfeito com transições invisíveis. Realizado com tesouras forjadas em metal do além', preco: 55.00 },
        { id: 3, nome: 'Navalha Demoníaca', descricao: 'Precisão sobrenatural com nossa navalha ritual. Inclui massagem craniana com óleos místicos', preco: 65.00 },
        { id: 4, nome: 'Barba Maldita', descricao: 'Modelagem completa da barba com produtos infernais. Inclui toalha quente e óleo de barba especial', preco: 40.00 },
        { id: 5, nome: 'Pacto Completo', descricao: 'Combo de corte e barba com direito a ritual completo. Inclui bebida e tratamento especial', preco: 90.00 },
        { id: 6, nome: 'Transformação Sombria', descricao: 'Mudança radical de visual com direito a coloração e tratamento capilar das trevas', preco: 120.00 }
      ],
      clientes: [
        { id: 1, nome: 'João Silva', email: 'joao@email.com', telefone: '(11) 99999-1111' },
        { id: 2, nome: 'Maria Souza', email: 'maria@email.com', telefone: '(11) 99999-2222' },
        { id: 3, nome: 'Pedro Santos', email: 'pedro@email.com', telefone: '(11) 99999-3333' }
      ],
      agendamentos: [
        {
          id: 1,
          cliente_id: 1,
          servico_id: 1,
          data_agendada: '2023-12-01',
          hora_agendada: '09:00:00',
          observacoes: 'Primeira vez',
          status: 'pendente'
        },
        {
          id: 2,
          cliente_id: 2,
          servico_id: 3,
          data_agendada: '2023-12-01',
          hora_agendada: '10:00:00',
          observacoes: 'Cliente regular',
          status: 'confirmado'
        },
        {
          id: 3,
          cliente_id: 3,
          servico_id: 5,
          data_agendada: '2023-12-02',
          hora_agendada: '14:00:00',
          observacoes: 'Alergia a produtos com alcool',
          status: 'pendente'
        }
      ],
      datas_bloqueadas: [],
      logs_agendamentos: []
    };
    
    this.nextClienteId = 4;
    this.nextAgendamentoId = 4;
    
    // Salvar os dados iniciais
    this.saveData();
  }
  
  // Método para persistir dados no localStorage
  private saveData(): void {
    localStorage.setItem('barbeariaDoAlemData', JSON.stringify(this.storage));
  }

  // Serviços
  getServicos(): Observable<Servico[]> {
    // Simulate API delay
    return of(this.storage.servicos).pipe(delay(800));
  }

  // Clientes
  addCliente(cliente: Cliente): Observable<Cliente> {
    // Verificar se o cliente já existe com o mesmo email
    const clienteExistente = this.storage.clientes.find(c => c.email === cliente.email);
    
    if (clienteExistente) {
      // Se o cliente já existe, retorna o cliente existente
      return of(clienteExistente).pipe(delay(800));
    }
    
    // Simulate API delay
    const newCliente = { ...cliente, id: this.nextClienteId++ };
    this.storage.clientes.push(newCliente);
    this.saveData();
    return of(newCliente).pipe(delay(800));
  }
  
  // Listar todos os clientes
  getClientes(): Observable<Cliente[]> {
    return of(this.storage.clientes).pipe(delay(800));
  }

  // Agendamentos
  createAgendamento(agendamento: Agendamento): Observable<Agendamento> {
    // Validate required fields
    if (!agendamento.cliente_id || !agendamento.servico_id || !agendamento.data_agendada || !agendamento.hora_agendada) {
      return throwError(() => new Error('Todos os campos são obrigatórios'));
    }

    // Verificar se a data está bloqueada
    if (this.storage.datas_bloqueadas.some(db => db.data === agendamento.data_agendada)) {
      return throwError(() => new Error('Data bloqueada para agendamento'));
    }

    // Verificar se já existe agendamento no mesmo horário
    const agendamentoExistente = this.storage.agendamentos.find(
      a => a.data_agendada === agendamento.data_agendada && 
           a.hora_agendada === agendamento.hora_agendada &&
           a.status !== 'cancelado'
    );

    if (agendamentoExistente) {
      return throwError(() => new Error('Horário já está ocupado'));
    }
    
    // Verificar se o cliente já tem agendamento no mesmo dia
    const agendamentoClienteMesmoDia = this.storage.agendamentos.find(
      a => a.cliente_id === agendamento.cliente_id && 
           a.data_agendada === agendamento.data_agendada &&
           a.status !== 'cancelado'
    );
    
    if (agendamentoClienteMesmoDia) {
      return throwError(() => new Error('Você já possui um agendamento neste dia. Escolha outra data.'));
    }
    
    // Verificar se já atingiu o limite de 7 agendamentos por dia (1 em cada horário)
    const agendamentosNoDia = this.storage.agendamentos.filter(
      a => a.data_agendada === agendamento.data_agendada && a.status !== 'cancelado'
    );
    
    if (agendamentosNoDia.length >= 7) {
      return throwError(() => new Error('Limite de agendamentos para este dia atingido. Por favor, escolha outra data.'));
    }
    
    // Buscar informações do cliente
    const cliente = this.storage.clientes.find(c => c.id === agendamento.cliente_id);
    
    // Converter servico_id para número se for string
    const servicoId = typeof agendamento.servico_id === 'string' ? parseInt(agendamento.servico_id) : agendamento.servico_id;
    
    // Obter informações do serviço
    let servicoNome = '';
    let servicoPreco = 0;
    
    switch(servicoId) {
      case 1:
        servicoNome = 'Corte Sobrenatural';
        servicoPreco = 45.00;
        break;
      case 2:
        servicoNome = 'Degradê Espectral';
        servicoPreco = 55.00;
        break;
      case 3:
        servicoNome = 'Navalha Demoníaca';
        servicoPreco = 65.00;
        break;
      case 4:
        servicoNome = 'Barba Maldita';
        servicoPreco = 40.00;
        break;
      case 5:
        servicoNome = 'Pacto Completo';
        servicoPreco = 90.00;
        break;
      case 6:
        servicoNome = 'Transformação Sombria';
        servicoPreco = 120.00;
        break;
      default:
        const servico = this.storage.servicos.find(s => s.id === servicoId);
        servicoNome = servico?.nome || 'Serviço desconhecido';
        servicoPreco = servico?.preco || 0;
    }

    // Simulate API delay
    const newAgendamento = { 
      ...agendamento, 
      id: this.nextAgendamentoId++,
      servico_id: servicoId, // Usar o ID convertido para número
      status: 'pendente',
      cliente_nome: cliente?.nome || 'Cliente #' + agendamento.cliente_id,
      cliente_email: cliente?.email || 'email@exemplo.com',
      cliente_telefone: cliente?.telefone || '(00) 00000-0000',
      servico_nome: servicoNome,
      servico_preco: servicoPreco
    };
    
    this.storage.agendamentos.push(newAgendamento);
    
    // Registrar log de criação do agendamento
    const log: LogAgendamento = {
      id: this.storage.logs_agendamentos.length + 1,
      agendamento_id: newAgendamento.id!,
      status_anterior: null,
      status_novo: 'pendente',
      alterado_por: 'sistema',
      criado_em: new Date().toISOString(),
      data_agendada: newAgendamento.data_agendada,
      hora_agendada: newAgendamento.hora_agendada,
      cliente_nome: newAgendamento.cliente_nome || ''
    };
    
    this.storage.logs_agendamentos.push(log);
    
    this.saveData();
    return of(newAgendamento).pipe(delay(800));
  }
  
  // Listar agendamentos
  getAgendamentos(): Observable<Agendamento[]> {
    // Adicionar informações de cliente e serviço aos agendamentos
    const agendamentosCompletos = this.storage.agendamentos.map(agendamento => {
      // Buscar informações do cliente
      const cliente = this.storage.clientes.find(c => c.id === agendamento.cliente_id);
      
      // Converter servico_id para número se for string
      const servicoId = typeof agendamento.servico_id === 'string' ? parseInt(agendamento.servico_id) : agendamento.servico_id;
      
      // Obter informações do serviço com valores fixos garantidos
      let servicoNome = '';
      let servicoPreco = 0;
      
      switch(servicoId) {
        case 1:
          servicoNome = 'Corte Sobrenatural';
          servicoPreco = 45.00;
          break;
        case 2:
          servicoNome = 'Degradê Espectral';
          servicoPreco = 55.00;
          break;
        case 3:
          servicoNome = 'Navalha Demoníaca';
          servicoPreco = 65.00;
          break;
        case 4:
          servicoNome = 'Barba Maldita';
          servicoPreco = 40.00;
          break;
        case 5:
          servicoNome = 'Pacto Completo';
          servicoPreco = 90.00;
          break;
        case 6:
          servicoNome = 'Transformação Sombria';
          servicoPreco = 120.00;
          break;
        default:
          const servico = this.storage.servicos.find(s => s.id === servicoId);
          servicoNome = servico?.nome || 'Serviço desconhecido';
          servicoPreco = servico?.preco || 0;
      }
      
      // Retornar agendamento com informações adicionais
      return {
        ...agendamento,
        servico_id: servicoId, // Usar o ID convertido para número
        cliente_nome: cliente?.nome || 'Cliente #' + agendamento.cliente_id,
        cliente_email: cliente?.email || 'email@exemplo.com',
        cliente_telefone: cliente?.telefone || '(00) 00000-0000',
        servico_nome: servicoNome,
        servico_preco: servicoPreco
      };
    });
    
    return of(agendamentosCompletos).pipe(delay(800));
  }
  
  // Verificar disponibilidade de horários para uma data
  verificarDisponibilidade(data: string): Observable<{horario: string, disponivel: boolean}[]> {
    const horarios = [
      '09:00:00', '10:00:00', '11:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00'
    ];
    
    // Encontrar agendamentos para a data especificada
    const agendamentosNaData = this.storage.agendamentos.filter(
      a => a.data_agendada === data && a.status !== 'cancelado'
    );
    
    // Mapear horários ocupados
    const horariosOcupados = agendamentosNaData.map(a => a.hora_agendada);
    
    // Criar lista de disponibilidade
    const disponibilidade = horarios.map(horario => ({
      horario,
      disponivel: !horariosOcupados.includes(horario)
    }));
    
    return of(disponibilidade).pipe(delay(800));
  }
  
  // Bloquear data
  bloquearData(data: string, motivo?: string): Observable<{success: boolean}> {
    if (!this.storage.datas_bloqueadas.some(db => db.data === data)) {
      this.storage.datas_bloqueadas.push({ data, motivo });
      this.saveData();
    }
    return of({success: true}).pipe(delay(800));
  }
  
  // Desbloquear data
  desbloquearData(data: string): Observable<{success: boolean}> {
    const index = this.storage.datas_bloqueadas.findIndex(db => db.data === data);
    if (index !== -1) {
      this.storage.datas_bloqueadas.splice(index, 1);
      this.saveData();
    }
    return of({success: true}).pipe(delay(800));
  }
  
  // Obter datas bloqueadas
  getDatasBloqueadas(): Observable<DataBloqueada[]> {
    return of(this.storage.datas_bloqueadas).pipe(delay(800));
  }
  
  // Obter logs de agendamentos
  getLogsAgendamentos(): Observable<LogAgendamento[]> {
    return of(this.storage.logs_agendamentos).pipe(delay(800));
  }
  
  // Atualizar status do agendamento
  atualizarStatusAgendamento(id: number, status: string): Observable<Agendamento> {
    console.log('Mock: Atualizando agendamento', id, 'para status', status);
    
    // Encontrar o agendamento pelo ID
    const indice = this.storage.agendamentos.findIndex(a => a.id === id);
    
    if (indice === -1) {
      console.error('Agendamento não encontrado:', id);
      return throwError(() => new Error('Agendamento não encontrado'));
    }
    
    // Guardar o status anterior
    const statusAnterior = this.storage.agendamentos[indice].status;
    
    // Atualizar o status
    this.storage.agendamentos[indice].status = status;
    console.log('Status atualizado com sucesso para:', status);
    
    // Registrar log da alteração
    const agendamento = this.storage.agendamentos[indice];
    const clienteLog = this.storage.clientes.find(c => c.id === agendamento.cliente_id);
    
    const log: LogAgendamento = {
      id: this.storage.logs_agendamentos.length + 1,
      agendamento_id: id,
      status_anterior: statusAnterior || null,
      status_novo: status,
      alterado_por: 'sistema',
      criado_em: new Date().toISOString(),
      data_agendada: agendamento.data_agendada,
      hora_agendada: agendamento.hora_agendada,
      cliente_nome: clienteLog?.nome || 'Cliente #' + agendamento.cliente_id
    };
    
    this.storage.logs_agendamentos.push(log);
    
    // Salvar no localStorage
    this.saveData();
    
    // Retornar o agendamento atualizado
    const agendamentoAtualizado = this.storage.agendamentos[indice];
    
    // Adicionar informações de cliente e serviço
    const cliente = this.storage.clientes.find((c: Cliente) => c.id === agendamentoAtualizado.cliente_id);
    
    // Converter servico_id para número se for string
    const servicoId = typeof agendamentoAtualizado.servico_id === 'string' ? parseInt(agendamentoAtualizado.servico_id) : agendamentoAtualizado.servico_id;
    
    // Obter informações do serviço
    let servicoNome = '';
    let servicoPreco = 0;
    
    switch(servicoId) {
      case 1:
        servicoNome = 'Corte Sobrenatural';
        servicoPreco = 45.00;
        break;
      case 2:
        servicoNome = 'Degradê Espectral';
        servicoPreco = 55.00;
        break;
      case 3:
        servicoNome = 'Navalha Demoníaca';
        servicoPreco = 65.00;
        break;
      case 4:
        servicoNome = 'Barba Maldita';
        servicoPreco = 40.00;
        break;
      case 5:
        servicoNome = 'Pacto Completo';
        servicoPreco = 90.00;
        break;
      case 6:
        servicoNome = 'Transformação Sombria';
        servicoPreco = 120.00;
        break;
    }
    
    const agendamentoCompleto = {
      ...agendamentoAtualizado,
      servico_id: servicoId, // Usar o ID convertido para número
      cliente_nome: cliente?.nome || 'Cliente #' + agendamentoAtualizado.cliente_id,
      cliente_email: cliente?.email || 'email@exemplo.com',
      cliente_telefone: cliente?.telefone || '(00) 00000-0000',
      servico_nome: servicoNome,
      servico_preco: servicoPreco
    };
    
    return of(agendamentoCompleto).pipe(delay(800));
  }
}