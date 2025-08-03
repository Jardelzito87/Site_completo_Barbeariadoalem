import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LoginModalService } from '../../services/login-modal.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  carregando = false;
  mensagem = '';
  mensagemTipo = '';
  mostrarSenha = false;
  isModalOpen = false;
  private subscription: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loginModalService: LoginModalService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Inicializando componente de login modal...');
    
    // Inicializar formulário
    this.initForm();
    
    // Escutar mudanças do modal
    this.subscription.add(
      this.loginModalService.isOpen$.subscribe(isOpen => {
        this.isModalOpen = isOpen;
        if (isOpen) {
          // Reset do formulário quando abre o modal
          this.resetForm();
          this.checkAuthenticationStatus();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private checkAuthenticationStatus(): void {
    // Primeiro verificar no servidor se a sessão é realmente válida
    if (this.authService.isAuthenticated) {
      console.log('🔍 Dados de login encontrados localmente, verificando no servidor...');
      
      // Verificar no servidor se a sessão é válida
      this.authService.checkAuthStatus().subscribe({
        next: (response) => {
          if (response.authenticated) {
            console.log('✅ Sessão válida no servidor, redirecionando...');
            this.mostrarMensagemJaLogado();
          } else {
            console.log('❌ Sessão inválida no servidor, limpando dados locais...');
            this.authService.clearLocalData();
            this.mensagem = '';
          }
        },
        error: (error) => {
          console.log('❌ Erro ao verificar sessão, limpando dados locais:', error);
          this.authService.clearLocalData();
          this.mensagem = 'Sessão expirada. Faça login novamente.';
          this.mensagemTipo = 'erro';
        }
      });
    } else {
      console.log('ℹ️ Nenhum login detectado, formulário pronto para uso');
    }
  }

  private mostrarMensagemJaLogado(): void {
    const admin = this.authService.currentAdmin;
    this.mensagem = `Você já está logado como ${admin?.nome || 'administrador'}. Redirecionando...`;
    this.mensagemTipo = 'info';
    
    // Redirecionar após 2 segundos
    setTimeout(() => {
      this.router.navigate(['/admin']);
    }, 2000);
  }

  // Método para forçar logout quando há problema com sessão
  forcarLogout(): void {
    console.log('🔄 Forçando limpeza de sessão...');
    this.authService.clearLocalData();
    this.mensagem = 'Sessão limpa com sucesso. Você pode fazer login novamente.';
    this.mensagemTipo = 'sucesso';
    
    // Limpar mensagem após alguns segundos
    setTimeout(() => {
      this.mensagem = '';
    }, 3000);
  }

  initForm(): void {
    console.log('🔧 Inicializando formulário de login...');
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(3)]]
    });
    console.log('✅ Formulário inicializado:', this.loginForm);
  }

  toggleSenha(): void {
    this.mostrarSenha = !this.mostrarSenha;
  }

  // Métodos para controle do modal
  closeModal(): void {
    this.loginModalService.closeModal();
  }

  closeOnBackdrop(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  resetForm(): void {
    console.log('🔄 Resetando formulário...');
    this.loginForm.patchValue({
      email: '',
      senha: ''
    });
    this.mensagem = '';
    this.mensagemTipo = '';
    this.carregando = false;
    this.mostrarSenha = false;
  }

  onSubmit(): void {
    // Verificar novamente se já está logado antes de tentar fazer login
    if (this.authService.isAuthenticated) {
      this.mostrarMensagemJaLogado();
      return;
    }

    if (this.loginForm.invalid) {
      this.mensagem = 'Por favor, preencha todos os campos corretamente';
      this.mensagemTipo = 'erro';
      return;
    }

    this.carregando = true;
    this.mensagem = '';
    
    const { email, senha } = this.loginForm.value;

    this.authService.login(email, senha).subscribe({
      next: (response) => {
        console.log('Login realizado com sucesso:', response);
        this.mensagem = 'Login realizado com sucesso!';
        this.mensagemTipo = 'sucesso';
        
        // Aguardar um momento, fechar modal e redirecionar
        setTimeout(() => {
          this.closeModal();
          this.router.navigate(['/admin']);
        }, 1500);
        
        this.carregando = false;
      },
      error: (error) => {
        console.error('Erro no login:', error);
        
        if (error.status === 401) {
          this.mensagem = 'Email ou senha incorretos';
          this.mensagemTipo = 'erro';
        } else if (error.status === 400) {
          this.mensagem = 'Por favor, preencha todos os campos';
          this.mensagemTipo = 'erro';
        } else if (error.status === 409) {
          // Erro de sessão duplicada
          this.mensagem = 'Já existe uma sessão ativa para este administrador. Faça logout da sessão atual ou aguarde a expiração.';
          this.mensagemTipo = 'info';
        } else {
          this.mensagem = 'Erro interno do servidor. Tente novamente.';
          this.mensagemTipo = 'erro';
        }
        
        this.carregando = false;
      }
    });
  }

  // Getters para facilitar acesso aos campos no template
  get email() { return this.loginForm.get('email'); }
  get senha() { return this.loginForm.get('senha'); }
}
