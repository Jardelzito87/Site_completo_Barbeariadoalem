/**
 * ==============================
 * SERVIÇO DE AUTENTICAÇÃO
 * Gerencia login, logout e estado de autenticação dos administradores
 * ==============================
 */

// Importações do Angular Core
import { Injectable } from '@angular/core';
// Importações para requisições HTTP
import { HttpClient, HttpHeaders } from '@angular/common/http';
// Importações do RxJS para programação reativa
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
// Configurações de ambiente (URLs da API)
import { environment } from '../../environments/environment';

/**
 * INTERFACE DO ADMINISTRADOR
 * Define a estrutura dos dados de um administrador
 */
export interface Admin {
  id: number; // ID único do administrador
  nome: string; // Nome completo
  email: string; // Email para login
  nivelAcesso: string; // Nível de acesso (admin, super_admin, etc.)
  ultimoLogin?: string; // Data do último login (opcional)
}

/**
 * INTERFACE DA RESPOSTA DE LOGIN
 * Define a estrutura da resposta da API ao fazer login
 */
export interface LoginResponse {
  success: boolean; // Indica se o login foi bem-sucedido
  token: string; // Token JWT para autenticação
  admin: Admin; // Dados do administrador logado
}

/**
 * SERVIÇO DE AUTENTICAÇÃO
 * Serviço singleton responsável por:
 * - Gerenciar login e logout de administradores
 * - Manter estado de autenticação em tempo real
 * - Validar e armazenar tokens JWT
 * - Fornecer headers de autenticação para requisições
 */
@Injectable({
  providedIn: 'root' // Serviço singleton disponível em toda a aplicação
})
export class AuthService {
  /** URL base da API obtida das configurações de ambiente */
  private apiUrl = environment.apiUrl;
  
  /** Chaves para armazenamento no localStorage */
  private tokenKey = 'admin-token'; // Chave para armazenar o token JWT
  private adminKey = 'admin-logado'; // Chave para armazenar dados do admin
  
  /**
   * GERENCIAMENTO DE ESTADO REATIVO
   * BehaviorSubjects para notificar componentes sobre mudanças no estado de autenticação
   */
  // Subject para estado de autenticação (logado/não logado)
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  // Subject para dados do administrador atual
  private currentAdminSubject = new BehaviorSubject<Admin | null>(this.getStoredAdmin());

  /**
   * CONSTRUTOR
   * Injeta o HttpClient para fazer requisições HTTP
   * @param http - Cliente HTTP do Angular
   */
  constructor(private http: HttpClient) { }

  // Observables públicos
  get isAuthenticated$(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  get currentAdmin$(): Observable<Admin | null> {
    return this.currentAdminSubject.asObservable();
  }

  // Verificar se tem token
  private hasToken(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      return false;
    }
    
    // Verificar se o token não está corrompido (verificação básica)
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.log('⚠️ Token JWT mal formado, limpando...');
        this.clearAuth();
        return false;
      }
      
      // Decodificar payload para verificar expiração
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < now) {
        console.log('⚠️ Token expirado, limpando...');
        this.clearAuth();
        return false;
      }
      
      return true;
    } catch (error) {
      console.log('⚠️ Erro ao validar token, limpando:', error);
      this.clearAuth();
      return false;
    }
  }

  // Obter admin armazenado
  private getStoredAdmin(): Admin | null {
    const adminData = localStorage.getItem(this.adminKey);
    return adminData ? JSON.parse(adminData) : null;
  }

  // Obter dados do admin logado (método público)
  getAdminLogado(): Admin | null {
    return this.getStoredAdmin();
  }

  // Login
  login(email: string, senha: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/admin/login`, { email, senha })
      .pipe(
        tap(response => {
          if (response.success) {
            // Armazenar token e dados do admin
            localStorage.setItem(this.tokenKey, response.token);
            localStorage.setItem(this.adminKey, JSON.stringify(response.admin));
            
            // Atualizar subjects
            this.isAuthenticatedSubject.next(true);
            this.currentAdminSubject.next(response.admin);
          }
        }),
        catchError(error => {
          console.error('Erro no login:', error);
          return throwError(() => error);
        })
      );
  }

  // Logout
  logout(): Observable<any> {
    const headers = this.getAuthHeaders();
    
    return this.http.post(`${this.apiUrl}/admin/logout`, {}, { headers })
      .pipe(
        tap(() => this.clearAuth()),
        catchError(error => {
          // Mesmo se der erro, limpar auth local
          this.clearAuth();
          return throwError(() => error);
        })
      );
  }

  // Limpar autenticação
  private clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.adminKey);
    this.isAuthenticatedSubject.next(false);
    this.currentAdminSubject.next(null);
  }

  // Limpar dados locais (método público)
  clearLocalData(): void {
    this.clearAuth();
  }

  // Obter headers de autenticação
  getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.tokenKey);
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // Verificar status de autenticação no servidor
  checkAuthStatus(): Observable<any> {
    const headers = this.getAuthHeaders();
    
    return this.http.get(`${this.apiUrl}/admin/status`, { headers })
      .pipe(
        tap(response => {
          if (response && (response as any).authenticated) {
            this.isAuthenticatedSubject.next(true);
            this.currentAdminSubject.next((response as any).admin);
          } else {
            console.log('🔐 Sessão invalidada pelo servidor - fazendo logout automático');
            this.clearAuth();
          }
        }),
        catchError(error => {
          // Se erro 401, significa que a sessão foi invalidada
          if (error.status === 401) {
            console.log('🔐 Token inválido detectado - servidor pode ter sido reiniciado');
            console.log('🔄 Fazendo logout automático...');
          }
          this.clearAuth();
          return throwError(() => error);
        })
      );
  }

  // Getter para verificação rápida
  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  // Getter para admin atual
  get currentAdmin(): Admin | null {
    return this.currentAdminSubject.value;
  }

  // Listar administradores
  async listarAdmins(): Promise<any[]> {
    const response = await this.http.get<any[]>(`${this.apiUrl}/admins`, {
      headers: this.getAuthHeaders()
    }).toPromise();
    return response || [];
  }

  // Criar novo administrador
  async criarAdmin(admin: {nome: string, email: string, nivel_acesso: string}): Promise<any> {
    const response = await this.http.post<any>(`${this.apiUrl}/admins`, admin, {
      headers: this.getAuthHeaders()
    }).toPromise();
    return response;
  }

  // Alterar senha do administrador
  async alterarSenhaAdmin(id: number, senhaAtual: string, novaSenha: string): Promise<any> {
    const response = await this.http.put<any>(`${this.apiUrl}/admins/${id}/senha`, {
      senhaAtual,
      novaSenha
    }, {
      headers: this.getAuthHeaders()
    }).toPromise();
    return response;
  }
}
