import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Servico {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
}

export interface Cliente {
  id?: number;
  nome: string;
  email: string;
  telefone: string;
}

export interface Agendamento {
  id?: number;
  cliente_id: number;
  servico_id: number;
  data_agendada: string;
  hora_agendada: string;
  observacoes: string;
  status?: string;
  cliente_nome?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  servico_nome?: string;
  servico_preco?: number;
}

export interface Disponibilidade {
  horario: string;
  disponivel: boolean;
}

export interface DataBloqueada {
  data: string;
  motivo?: string;
}

export interface LogAgendamento {
  id: number;
  agendamento_id: number | null;
  status_anterior: string | null;
  status_novo: string;
  alterado_por: string;
  criado_em: string;
  data_agendada: string;
  hora_agendada: string;
  cliente_nome: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private apiUrl = environment.apiUrl; // URL do backend

  constructor(private http: HttpClient) { }

  // Obter headers de autenticação
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('admin-token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
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