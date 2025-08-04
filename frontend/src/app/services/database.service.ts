/**
 * ==============================
 * SERVIÇO DE BANCO DE DADOS
 * Gerencia todas as operações com a API do backend
 * ==============================
 */

// Importações do Angular Core
import { Injectable } from '@angular/core';
// Importações para requisições HTTP
import { HttpClient, HttpHeaders } from '@angular/common/http';
// Importações do RxJS
import { Observable } from 'rxjs';
// Configurações de ambiente
import { environment } from '../../environments/environment';

/**
 * INTERFACE DO SERVIÇO
 * Define a estrutura dos serviços oferecidos pela barbearia
 */
export interface Servico {
  id: number; // ID único do serviço
  nome: string; // Nome do serviço (ex: "Corte Sobrenatural")
  descricao: string; // Descrição detalhada do serviço
  preco: number; // Preço do serviço em reais
}

/**
 * INTERFACE DO CLIENTE
 * Define a estrutura dos dados do cliente
 */
export interface Cliente {
  id?: number; // ID único (opcional, gerado pelo backend)
  nome: string; // Nome completo do cliente
  email: string; // Email para contato
  telefone: string; // Telefone para contato
}

/**
 * INTERFACE DO AGENDAMENTO
 * Define a estrutura completa de um agendamento
 */
export interface Agendamento {
  id?: number; // ID único (opcional, gerado pelo backend)
  cliente_id: number; // ID do cliente que fez o agendamento
  servico_id: number; // ID do serviço agendado
  data_agendada: string; // Data do agendamento (formato YYYY-MM-DD)
  hora_agendada: string; // Hora do agendamento (formato HH:MM:SS)
  observacoes: string; // Observações adicionais do cliente
  status?: string; // Status do agendamento (pendente, confirmado, concluido, etc.)
  
  // Campos adicionais retornados pelo backend (JOINs)
  cliente_nome?: string; // Nome do cliente (obtido via JOIN)
  cliente_email?: string; // Email do cliente (obtido via JOIN)
  cliente_telefone?: string; // Telefone do cliente (obtido via JOIN)
  servico_nome?: string; // Nome do serviço (obtido via JOIN)
  servico_preco?: number; // Preço do serviço (obtido via JOIN)
}

/**
 * INTERFACE DE DISPONIBILIDADE
 * Define a estrutura para verificar disponibilidade de horários
 */
export interface Disponibilidade {
  horario: string; // Horário no formato HH:MM
  disponivel: boolean; // Se o horário está disponível ou ocupado
}

/**
 * INTERFACE DE DATA BLOQUEADA
 * Define a estrutura para datas bloqueadas pelo administrador
 */
export interface DataBloqueada {
  data: string; // Data bloqueada no formato YYYY-MM-DD
  motivo?: string; // Motivo do bloqueio (opcional)
}

/**
 * INTERFACE DE LOG DE AGENDAMENTO
 * Define a estrutura dos logs de alterações nos agendamentos
 */
export interface LogAgendamento {
  id: number; // ID único do log
  agendamento_id: number | null; // ID do agendamento alterado
  status_anterior: string | null; // Status anterior do agendamento
  status_novo: string; // Novo status do agendamento
  alterado_por: string; // Nome do administrador que fez a alteração
  criado_em: string; // Data/hora da alteração
  data_agendada: string; // Data do agendamento
  hora_agendada: string; // Hora do agendamento
  cliente_nome: string; // Nome do cliente
}

/**
 * SERVIÇO DE BANCO DE DADOS
 * Serviço responsável por:
 * - Comunicar com a API do backend
 * - Gerenciar operações CRUD de clientes, agendamentos e serviços
 * - Validar duplicatas e disponibilidade
 * - Gerenciar datas bloqueadas
 * - Obter logs de alterações
 */
@Injectable({
  providedIn: 'root' // Serviço singleton disponível em toda a aplicação
})
export class DatabaseService {
  /** URL base da API obtida das configurações de ambiente */
  private apiUrl = environment.apiUrl;

  /**
   * CONSTRUTOR
   * Injeta o HttpClient para fazer requisições HTTP
   * @param http - Cliente HTTP do Angular
   */
  constructor(private http: HttpClient) { }

  /**
   * OBTER HEADERS DE AUTENTICAÇÃO
   * Método privado que cria headers com token JWT para requisições autenticadas
   * @returns HttpHeaders com Authorization Bearer token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('admin-token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`, // Token JWT para autenticação
      'Content-Type': 'application/json' // Tipo de conteúdo JSON
    });
  }

  // Serviços (rota pública)
  getServicos(): Observable<Servico[]> {
    return this.http.get<Servico[]>(`${this.apiUrl}/servicos`);
  }

  // Clientes (rota pública para leitura)
  getClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.apiUrl}/clientes`);
  }
  
  // Verificar duplicatas de cliente
  verificarDuplicataCliente(cliente: Cliente): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/clientes/verificar-duplicata`, cliente);
  }
  
  // Verificar se um nome já existe
  verificarNomeExistente(nome: string): Observable<{ existe: boolean }> {
    return this.http.get<{ existe: boolean }>(`${this.apiUrl}/clientes/verificar-nome?nome=${encodeURIComponent(nome)}`);
  }
  
  // Verificar se um email já existe
  verificarEmailExistente(email: string): Observable<{ existe: boolean }> {
    return this.http.get<{ existe: boolean }>(`${this.apiUrl}/clientes/verificar-email?email=${encodeURIComponent(email)}`);
  }
  
  // Verificar se um telefone já existe
  verificarTelefoneExistente(telefone: string): Observable<{ existe: boolean }> {
    // Remove formatação do telefone antes de enviar
    const telefoneNumerico = telefone.replace(/\D/g, '');
    return this.http.get<{ existe: boolean }>(`${this.apiUrl}/clientes/verificar-telefone?telefone=${telefoneNumerico}`);
  }
  
  addCliente(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.apiUrl}/clientes`, cliente);
  }

  // Agendamentos
  createAgendamento(agendamento: Agendamento): Observable<Agendamento> {
    return this.http.post<Agendamento>(`${this.apiUrl}/agendamentos`, agendamento);
  }
  
  // Listar agendamentos
  getAgendamentos(): Observable<Agendamento[]> {
    return this.http.get<Agendamento[]>(`${this.apiUrl}/agendamentos`, { headers: this.getAuthHeaders() });
  }
  
  // Bloquear data
  bloquearData(data: string, motivo?: string): Observable<{success: boolean}> {
    return this.http.post<{success: boolean}>(`${this.apiUrl}/datas-bloqueadas`, { data, motivo }, { headers: this.getAuthHeaders() });
  }
  
  // Desbloquear data
  desbloquearData(data: string): Observable<{success: boolean}> {
    return this.http.delete<{success: boolean}>(`${this.apiUrl}/datas-bloqueadas/${data}`, { headers: this.getAuthHeaders() });
  }
  
  // Obter datas bloqueadas
  getDatasBloqueadas(): Observable<DataBloqueada[]> {
    return this.http.get<DataBloqueada[]>(`${this.apiUrl}/datas-bloqueadas`, { headers: this.getAuthHeaders() });
  }
  
  // Atualizar status do agendamento
  atualizarStatusAgendamento(id: number, status: string): Observable<Agendamento> {
    return this.http.patch<Agendamento>(`${this.apiUrl}/agendamentos/${id}`, { status }, { headers: this.getAuthHeaders() });
  }
  
  // Verificar disponibilidade de horários para uma data
  verificarDisponibilidade(data: string): Observable<Disponibilidade[]> {
    return this.http.get<Disponibilidade[]>(`${this.apiUrl}/disponibilidade?data=${data}`, { headers: this.getAuthHeaders() });
  }

  // Verificar se um horário específico está disponível
  verificarHorarioDisponivel(data: string, hora: string): Observable<{ disponivel: boolean }> {
    return this.http.get<{ disponivel: boolean }>(
      `${this.apiUrl}/verificar-horario?data=${data}&hora=${hora}`,
      { headers: this.getAuthHeaders() }
    );
  }
  
  // Obter logs de agendamentos
  getLogsAgendamentos(): Observable<LogAgendamento[]> {
    return this.http.get<LogAgendamento[]>(`${this.apiUrl}/logs-agendamentos`, { headers: this.getAuthHeaders() });
  }
  
  // Obter agendamentos por data
  getAgendamentosPorData(data: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/agendamentos-data?data=${data}`);
  }
}