import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

interface Admin {
  id: number;
  nome: string;
  email: string;
  nivel_acesso: string;
  ativo: boolean;
  ultimo_login: string;
  criado_em: string;
}

@Component({
  selector: 'app-gerenciar-admins',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="gerenciar-admins-container">
      <h2>🔐 Gerenciar Administradores</h2>
      
      <!-- Lista de Administradores -->
      <div class="admins-lista">
        <h3>📋 Lista de Administradores</h3>
        <div class="table-container">
          <table class="admins-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Nível</th>
                <th>Status</th>
                <th>Último Login</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let admin of admins">
                <td>{{ admin.nome }}</td>
                <td>{{ admin.email }}</td>
                <td>{{ admin.nivel_acesso }}</td>
                <td>
                  <span [class]="admin.ativo ? 'status-ativo' : 'status-inativo'">
                    {{ admin.ativo ? 'Ativo' : 'Inativo' }}
                  </span>
                </td>
                <td>{{ formatarData(admin.ultimo_login) }}</td>
                <td>
                  <button (click)="abrirAlterarSenha(admin)" class="btn-alterar-senha">
                    🔑 Alterar Senha
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Botão Adicionar Novo -->
      <div class="acoes-container">
        <button (click)="mostrarFormNovoAdmin = !mostrarFormNovoAdmin" class="btn-novo-admin">
          {{ mostrarFormNovoAdmin ? '❌ Cancelar' : '➕ Adicionar Novo Administrador' }}
        </button>
      </div>

      <!-- Formulário Novo Admin -->
      <div *ngIf="mostrarFormNovoAdmin" class="form-container">
        <h3>➕ Novo Administrador</h3>
        <form (ngSubmit)="criarAdmin()" #formNovoAdmin="ngForm">
          <div class="form-group">
            <label>Nome:</label>
            <input type="text" [(ngModel)]="novoAdmin.nome" name="nome" required>
          </div>
          <div class="form-group">
            <label>Email:</label>
            <input type="email" [(ngModel)]="novoAdmin.email" name="email" required>
          </div>
          <div class="form-group">
            <label>Nível de Acesso:</label>
            <select [(ngModel)]="novoAdmin.nivel_acesso" name="nivel_acesso" required>
              <option value="">Selecione...</option>
              <option value="admin">Administrador</option>
              <option value="moderador">Moderador</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="submit" [disabled]="!formNovoAdmin.valid || carregando" class="btn-criar">
              {{ carregando ? '⏳ Criando...' : '✅ Criar Administrador' }}
            </button>
          </div>
          <p class="senha-info">💡 Senha padrão será: <strong>admin123</strong></p>
        </form>
      </div>

      <!-- Formulário Alterar Senha -->
      <div *ngIf="mostrarFormAlterarSenha" class="form-container">
        <h3>🔑 Alterar Senha - {{ adminSelecionado?.nome }}</h3>
        <form (ngSubmit)="alterarSenha()" #formAlterarSenha="ngForm">
          <div class="form-group">
            <label>Senha Atual:</label>
            <input type="password" [(ngModel)]="alterarSenhaForm.senhaAtual" name="senhaAtual" required>
          </div>
          <div class="form-group">
            <label>Nova Senha:</label>
            <input type="password" [(ngModel)]="alterarSenhaForm.novaSenha" name="novaSenha" required minlength="6">
          </div>
          <div class="form-group">
            <label>Confirmar Nova Senha:</label>
            <input type="password" [(ngModel)]="alterarSenhaForm.confirmarSenha" name="confirmarSenha" required>
          </div>
          <div class="form-actions">
            <button type="submit" [disabled]="!formAlterarSenha.valid || carregando" class="btn-alterar">
              {{ carregando ? '⏳ Alterando...' : '🔄 Alterar Senha' }}
            </button>
            <button type="button" (click)="cancelarAlterarSenha()" class="btn-cancelar">
              ❌ Cancelar
            </button>
          </div>
        </form>
      </div>

      <!-- Mensagens -->
      <div *ngIf="mensagem" [class]="'mensagem ' + tipoMensagem">
        {{ mensagem }}
      </div>
    </div>
  `,
  styles: [`
    .gerenciar-admins-container {
      max-width: 1000px;
      margin: 20px auto;
      padding: 20px;
      background: #1a1a1a;
      border-radius: 10px;
      color: #eee;
    }

    h2, h3 {
      color: #d4af37;
      margin-bottom: 20px;
    }

    .table-container {
      overflow-x: auto;
      margin-bottom: 20px;
    }

    .admins-table {
      width: 100%;
      border-collapse: collapse;
      background: #222;
      border-radius: 8px;
      overflow: hidden;
    }

    .admins-table th,
    .admins-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #333;
    }

    .admins-table th {
      background: #d4af37;
      color: #000;
      font-weight: bold;
    }

    .status-ativo {
      color: #00ff00;
      font-weight: bold;
    }

    .status-inativo {
      color: #ff6666;
      font-weight: bold;
    }

    .acoes-container {
      text-align: center;
      margin: 20px 0;
    }

    .btn-novo-admin {
      background: #d4af37;
      color: #000;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      font-weight: bold;
    }

    .btn-alterar-senha {
      background: #b30000;
      color: #fff;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .form-container {
      background: #2a2a2a;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }

    .form-group {
      margin-bottom: 15px;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      color: #d4af37;
      font-weight: bold;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 10px;
      border: 1px solid #555;
      border-radius: 4px;
      background: #333;
      color: #eee;
    }

    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    .btn-criar,
    .btn-alterar {
      background: #00aa00;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
    }

    .btn-cancelar {
      background: #666;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
    }

    .senha-info {
      margin-top: 10px;
      padding: 10px;
      background: #333;
      border-radius: 4px;
      color: #d4af37;
    }

    .mensagem {
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
      text-align: center;
    }

    .mensagem.sucesso {
      background: #004400;
      color: #00ff00;
    }

    .mensagem.erro {
      background: #440000;
      color: #ff6666;
    }

    @media (max-width: 768px) {
      .admins-table {
        font-size: 12px;
      }
      
      .form-actions {
        flex-direction: column;
      }
    }
  `]
})
export class GerenciarAdminsComponent implements OnInit {
  admins: Admin[] = [];
  mostrarFormNovoAdmin = false;
  mostrarFormAlterarSenha = false;
  adminSelecionado: Admin | null = null;
  carregando = false;
  mensagem = '';
  tipoMensagem = '';

  novoAdmin = {
    nome: '',
    email: '',
    nivel_acesso: ''
  };

  alterarSenhaForm = {
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  };

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.carregarAdmins();
  }

  async carregarAdmins() {
    try {
      this.admins = await this.authService.listarAdmins();
    } catch (error) {
      this.mostrarMensagem('Erro ao carregar administradores', 'erro');
    }
  }

  async criarAdmin() {
    if (this.carregando) return;
    
    this.carregando = true;
    try {
      const resultado = await this.authService.criarAdmin(this.novoAdmin);
      this.mostrarMensagem(`Administrador criado! Senha temporária: ${resultado.senhaTemporaria}`, 'sucesso');
      this.novoAdmin = { nome: '', email: '', nivel_acesso: '' };
      this.mostrarFormNovoAdmin = false;
      await this.carregarAdmins();
    } catch (error: any) {
      this.mostrarMensagem(error.error?.error || 'Erro ao criar administrador', 'erro');
    } finally {
      this.carregando = false;
    }
  }

  abrirAlterarSenha(admin: Admin) {
    this.adminSelecionado = admin;
    this.mostrarFormAlterarSenha = true;
    this.alterarSenhaForm = { senhaAtual: '', novaSenha: '', confirmarSenha: '' };
  }

  async alterarSenha() {
    if (this.carregando || !this.adminSelecionado) return;

    if (this.alterarSenhaForm.novaSenha !== this.alterarSenhaForm.confirmarSenha) {
      this.mostrarMensagem('As senhas não coincidem', 'erro');
      return;
    }

    this.carregando = true;
    try {
      await this.authService.alterarSenhaAdmin(
        this.adminSelecionado.id,
        this.alterarSenhaForm.senhaAtual,
        this.alterarSenhaForm.novaSenha
      );
      this.mostrarMensagem('Senha alterada com sucesso!', 'sucesso');
      this.cancelarAlterarSenha();
    } catch (error: any) {
      this.mostrarMensagem(error.error?.error || 'Erro ao alterar senha', 'erro');
    } finally {
      this.carregando = false;
    }
  }

  cancelarAlterarSenha() {
    this.mostrarFormAlterarSenha = false;
    this.adminSelecionado = null;
    this.alterarSenhaForm = { senhaAtual: '', novaSenha: '', confirmarSenha: '' };
  }

  formatarData(data: string): string {
    if (!data) return 'Nunca';
    return new Date(data).toLocaleString('pt-BR');
  }

  mostrarMensagem(texto: string, tipo: string) {
    this.mensagem = texto;
    this.tipoMensagem = tipo;
    setTimeout(() => {
      this.mensagem = '';
    }, 5000);
  }
}