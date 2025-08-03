import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { DatabaseService, Servico, Cliente, Agendamento } from '../../services/database.service';
import { SERVICOS_FIXOS } from './servicos-fixos';

@Component({
  selector: 'app-agendamento',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './agendamento.component.html',
  styleUrl: './agendamento.component.css'
})
export class AgendamentoComponent implements OnInit {
  // Usar serviços fixos diretamente
  servicos: Servico[] = SERVICOS_FIXOS;
  mensagem = '';
  mensagemTipo = '';
  carregando = false;
  agendamentoForm!: FormGroup;
  dataMinima: string;

  // Controle de duplicatas
  duplicataErrors = {
    nome: false,
    email: false,
    telefone: false,
    mensagem: ''
  };

  // Agendamentos do dia selecionado
  agendamentosDoDia: any[] = [];
  dataBloqueada = false;

  cliente: Cliente = {
    nome: '',
    email: '',
    telefone: ''
  };

  agendamento: Agendamento = {
    cliente_id: 0,
    servico_id: 0,
    data_agendada: '',
    hora_agendada: '',
    observacoes: ''
  };

  constructor(private dbService: DatabaseService, private fb: FormBuilder) {
    // Define a data mínima como hoje no formato YYYY-MM-DD
    const hoje = new Date();
    this.dataMinima = hoje.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.initForm();
    console.log('Serviços disponíveis:', this.servicos);
  }

  // Função para verificar se a data selecionada é domingo
  verificarDomingo(event: Event): void {
    const target = event.target as HTMLInputElement;
    const dataStr = target.value;
    
    if (dataStr) {
      const [ano, mes, dia] = dataStr.split('-').map(Number);
      const data = new Date(ano, mes - 1, dia);
      const diaDaSemana = data.getDay();
      
      console.log(`Data selecionada: ${dataStr}, dia da semana: ${diaDaSemana}`);
      
      // Se for domingo (0), limpar o campo e mostrar alerta
      if (diaDaSemana === 0) {
        target.value = '';
        this.agendamentoForm.get('data_agendada')?.setValue('');
        this.mensagem = 'Não realizamos atendimentos aos domingos. Por favor, escolha outro dia.';
        this.mensagemTipo = 'erro';
        this.agendamentosDoDia = [];
        this.dataBloqueada = false;
      } else {
        // Buscar agendamentos para a data selecionada
        this.buscarAgendamentosDoDia(dataStr);
      }
    } else {
      this.agendamentosDoDia = [];
      this.dataBloqueada = false;
    }
  }

  // Buscar agendamentos para uma data específica
  buscarAgendamentosDoDia(data: string): void {
    this.dbService.getAgendamentosPorData(data).subscribe({
      next: (response: any) => {
        // Verificar se a resposta é um array (formato antigo) ou objeto (formato novo)
        if (Array.isArray(response)) {
          this.agendamentosDoDia = response;
        } else {
          this.agendamentosDoDia = response.agendamentos || [];
          this.dataBloqueada = response.dataBloqueada || false;
          
          // Se a data estiver bloqueada, mostrar mensagem
          if (response.dataBloqueada) {
            const motivo = response.motivoBloqueio || 'Data indisponível';
            this.mensagem = `Esta data está bloqueada para agendamentos. Motivo: ${motivo}`;
            this.mensagemTipo = 'erro';
          } else {
            // Limpar mensagem se a data não estiver bloqueada
            this.mensagem = '';
            this.mensagemTipo = '';
          }
        }
      },
      error: (err) => {
        console.error('Erro ao buscar agendamentos do dia:', err);
        this.agendamentosDoDia = [];
      }
    });
  }

  // Validador personalizado para permitir apenas letras e espaços no nome
  noNumbersValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const hasNumber = /\d/.test(control.value);
    return hasNumber ? { hasNumber: true } : null;
  }

  // Validador avançado para garantir que o nome esteja no formato correto
  nomeCompletoValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const value = control.value.trim();
    
    // Verificar sequências e repetições
    if (this.hasSequentialChars(value) || this.hasRepeatedChars(value)) {
      return { sequenciaInvalida: true };
    }
    
    // Verificar se parece com nome real
    if (!this.isRealName(value)) {
      return { nomeIrreal: true };
    }
    
    // Verifica se tem pelo menos 2 partes (nome e sobrenome)
    const parts = value.split(/\s+/);
    if (parts.length < 2) {
      return { nomeIncompleto: true };
    }
    
    // Verifica se cada parte tem pelo menos 2 caracteres
    for (const part of parts) {
      if (part.length < 2) {
        return { nomeIncompleto: true };
      }
    }
    
    return null;
  }

  // Validador para verificar se é um nome real
  isRealName(name: string): boolean {
    const parts = name.toLowerCase().split(/\s+/);
    
    // Lista de nomes comuns brasileiros
    const nomesComuns = [
      'ana', 'antonio', 'carlos', 'francisco', 'jose', 'joao', 'luis', 'luiz', 'marcos', 'paulo',
      'pedro', 'rafael', 'ricardo', 'roberto', 'sergio', 'alexandre', 'andre', 'bruno', 'daniel',
      'diego', 'eduardo', 'fabio', 'felipe', 'fernando', 'gabriel', 'gustavo', 'henrique', 'igor',
      'ivan', 'jorge', 'leonardo', 'lucas', 'marcelo', 'mario', 'mateus', 'miguel', 'nicolas',
      'otavio', 'renato', 'rodrigo', 'samuel', 'thiago', 'victor', 'vinicius', 'wellington',
      'maria', 'francisca', 'antonia', 'adriana', 'juliana', 'marcia', 'fernanda', 'patricia',
      'aline', 'amanda', 'andrea', 'angela', 'beatriz', 'bruna', 'camila', 'carla', 'carolina',
      'claudia', 'cristina', 'daniela', 'debora', 'denise', 'eliane', 'fabiana', 'flavia',
      'gabriela', 'helena', 'isabela', 'jaqueline', 'jessica', 'joana', 'julia', 'juliane',
      'karina', 'larissa', 'leticia', 'luana', 'luciana', 'mariana', 'michele', 'monica',
      'natalia', 'patricia', 'paula', 'priscila', 'raquel', 'renata', 'roberta', 'sandra',
      'simone', 'solange', 'sueli', 'tatiana', 'valeria', 'vanessa', 'vera', 'viviane'
    ];
    
    // Sobrenomes comuns brasileiros
    const sobrenomesComuns = [
      'silva', 'santos', 'oliveira', 'souza', 'rodrigues', 'ferreira', 'alves', 'pereira',
      'lima', 'gomes', 'ribeiro', 'carvalho', 'almeida', 'lopes', 'soares', 'fernandes',
      'vieira', 'barbosa', 'rocha', 'dias', 'monteiro', 'mendes', 'castro', 'campos',
      'cardoso', 'reis', 'araujo', 'cruz', 'cavalcanti', 'azevedo', 'teixeira', 'correia',
      'nascimento', 'moreira', 'jesus', 'martins', 'costa', 'pinto', 'andrade', 'ramos',
      'machado', 'freitas', 'garcia', 'cunha', 'guimaraes', 'moura', 'farias', 'peixoto',
      'batista', 'nunes', 'marques', 'melo', 'cardoso', 'torres', 'bezerra', 'sales',
      'coelho', 'duarte', 'fonseca', 'nogueira', 'morais', 'brito', 'medeiros', 'dantas'
    ];
    
    // Verificar se pelo menos o primeiro nome é comum
    const primeiroNome = parts[0];
    const temNomeComum = nomesComuns.includes(primeiroNome);
    
    // Verificar se pelo menos um sobrenome é comum
    const temSobrenomeComum = parts.slice(1).some(part => sobrenomesComuns.includes(part));
    
    // Verificar padrões de nomes falsos
    const temPadraFalso = parts.some(part => {
      // Muito curto ou muito longo
      if (part.length < 2 || part.length > 15) return true;
      
      // Muitas consoantes seguidas
      if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(part)) return true;
      
      // Muitas vogais seguidas
      if (/[aeiou]{4,}/i.test(part)) return true;
      
      // Padrões estranhos de alternância
      if (/^[aeiou][bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/i.test(part) && part.length === 4) return true;
      
      return false;
    });
    
    // Aceitar se tem nome comum OU sobrenome comum E não tem padrão falso
    return (temNomeComum || temSobrenomeComum) && !temPadraFalso;
  }

  // Validador para detectar sequências de caracteres
  hasSequentialChars(text: string): boolean {
    const cleanText = text.toLowerCase().replace(/\s/g, '');
    
    // Verificar sequências alfabéticas (abc, def, xyz, etc.)
    for (let i = 0; i < cleanText.length - 2; i++) {
      const char1 = cleanText.charCodeAt(i);
      const char2 = cleanText.charCodeAt(i + 1);
      const char3 = cleanText.charCodeAt(i + 2);
      
      if (char2 === char1 + 1 && char3 === char2 + 1) {
        return true;
      }
    }
    
    // Verificar sequências numéricas (123, 456, 789, etc.)
    for (let i = 0; i < cleanText.length - 2; i++) {
      const num1 = parseInt(cleanText[i]);
      const num2 = parseInt(cleanText[i + 1]);
      const num3 = parseInt(cleanText[i + 2]);
      
      if (!isNaN(num1) && !isNaN(num2) && !isNaN(num3)) {
        if (num2 === num1 + 1 && num3 === num2 + 1) {
          return true;
        }
      }
    }
    
    return false;
  }

  // Validador para detectar repetições excessivas
  hasRepeatedChars(text: string): boolean {
    const cleanText = text.toLowerCase().replace(/\s/g, '');
    
    // Verificar 3 ou mais caracteres iguais consecutivos
    for (let i = 0; i < cleanText.length - 2; i++) {
      if (cleanText[i] === cleanText[i + 1] && cleanText[i + 1] === cleanText[i + 2]) {
        return true;
      }
    }
    
    return false;
  }

  // Validador avançado para telefone
  telefoneValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    // Remove todos os caracteres não numéricos
    const phone = control.value.replace(/\D/g, '');
    
    // Verifica se tem entre 10 e 11 dígitos
    if (phone.length < 10 || phone.length > 11) {
      return { telefoneInvalido: true };
    }
    
    // Verificar sequências e repetições no telefone
    if (this.hasSequentialNumbers(phone) || this.hasRepeatedNumbers(phone)) {
      return { telefoneSequencial: true };
    }
    
    return null;
  }

  // Validador específico para sequências numéricas em telefone
  hasSequentialNumbers(phone: string): boolean {
    // Verificar sequências de 4 ou mais números consecutivos
    for (let i = 0; i < phone.length - 3; i++) {
      const num1 = parseInt(phone[i]);
      const num2 = parseInt(phone[i + 1]);
      const num3 = parseInt(phone[i + 2]);
      const num4 = parseInt(phone[i + 3]);
      
      if (num2 === num1 + 1 && num3 === num2 + 1 && num4 === num3 + 1) {
        return true;
      }
    }
    
    return false;
  }

  // Validador específico para repetições numéricas em telefone
  hasRepeatedNumbers(phone: string): boolean {
    // Verificar 5 ou mais números iguais consecutivos
    for (let i = 0; i < phone.length - 4; i++) {
      if (phone[i] === phone[i + 1] && 
          phone[i + 1] === phone[i + 2] && 
          phone[i + 2] === phone[i + 3] && 
          phone[i + 3] === phone[i + 4]) {
        return true;
      }
    }
    
    return false;
  }

  // Validador para evitar datas passadas e domingos
  dataFuturaValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataSelecionada = new Date(control.value);
    dataSelecionada.setHours(0, 0, 0, 0);
    
    // Verifica se a data é anterior a hoje
    if (dataSelecionada < hoje) {
      return { dataPassada: true };
    }
    
    return null;
  }

  // Validador de segurança para email
  emailSecurityValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const email = control.value.toLowerCase();
    const localPart = email.split('@')[0];
    
    if (!localPart) return null;
    
    // Verificar sequências e repetições na parte local do email
    if (this.hasSequentialChars(localPart) || this.hasExcessiveRepeatedChars(localPart)) {
      return { emailInseguro: true };
    }
    
    return null;
  }

  // Validador específico para repetições excessivas em email
  hasExcessiveRepeatedChars(text: string): boolean {
    // Verificar 4 ou mais caracteres iguais consecutivos
    for (let i = 0; i < text.length - 3; i++) {
      if (text[i] === text[i + 1] && 
          text[i + 1] === text[i + 2] && 
          text[i + 2] === text[i + 3]) {
        return true;
      }
    }
    
    return false;
  }

  // Métodos para verificação de duplicatas
  verificarNomeDuplicado(): void {
    const nome = this.agendamentoForm.get('nome')?.value;
    if (!nome) return;

    this.dbService.verificarNomeExistente(nome).subscribe({
      next: (resultado: any) => {
        this.duplicataErrors.nome = resultado.existe;
        this.atualizarMensagemDuplicata();
      },
      error: (err: any) => {
        console.error('Erro ao verificar nome duplicado:', err);
      }
    });
  }

  verificarEmailDuplicado(): void {
    const email = this.agendamentoForm.get('email')?.value;
    if (!email) return;

    this.dbService.verificarEmailExistente(email).subscribe({
      next: (resultado: any) => {
        this.duplicataErrors.email = resultado.existe;
        this.atualizarMensagemDuplicata();
      },
      error: (err: any) => {
        console.error('Erro ao verificar email duplicado:', err);
      }
    });
  }

  verificarTelefoneDuplicado(): void {
    const telefone = this.agendamentoForm.get('telefone')?.value?.replace(/\D/g, '');
    if (!telefone) return;

    this.dbService.verificarTelefoneExistente(telefone).subscribe({
      next: (resultado: any) => {
        this.duplicataErrors.telefone = resultado.existe;
        this.atualizarMensagemDuplicata();
      },
      error: (err: any) => {
        console.error('Erro ao verificar telefone duplicado:', err);
      }
    });
  }

  atualizarMensagemDuplicata(): void {
    const erros = [];
    
    if (this.duplicataErrors.nome) erros.push('nome');
    if (this.duplicataErrors.email) erros.push('e-mail');
    if (this.duplicataErrors.telefone) erros.push('telefone');
    
    if (erros.length > 0) {
      this.duplicataErrors.mensagem = `Já existe um cadastro com este ${erros.join(' e ')}.`;
    } else {
      this.duplicataErrors.mensagem = '';
    }
  }

  initForm(): void {
    this.agendamentoForm = this.fb.group({
      nome: ['', [
        Validators.required,
        Validators.minLength(3),
        this.noNumbersValidator.bind(this),
        this.nomeCompletoValidator.bind(this)
      ]],
      email: ['', [
        Validators.required,
        Validators.email,
        this.emailSecurityValidator.bind(this)
      ]],
      telefone: ['', [
        Validators.required,
        this.telefoneValidator.bind(this)
      ]],
      servico_id: ['', Validators.required],
      data_agendada: ['', [
        Validators.required,
        this.dataFuturaValidator.bind(this)
      ]],
      hora_agendada: ['', Validators.required],
      observacoes: ['']
    });

    // Adiciona validação em tempo real para duplicatas
    this.agendamentoForm.get('nome')?.valueChanges.subscribe(() => {
      if (this.agendamentoForm.get('nome')?.valid) {
        this.verificarNomeDuplicado();
      } else {
        this.duplicataErrors.nome = false;
        this.atualizarMensagemDuplicata();
      }
    });

    this.agendamentoForm.get('email')?.valueChanges.subscribe(() => {
      if (this.agendamentoForm.get('email')?.valid) {
        this.verificarEmailDuplicado();
      } else {
        this.duplicataErrors.email = false;
        this.atualizarMensagemDuplicata();
      }
    });

    this.agendamentoForm.get('telefone')?.valueChanges.subscribe(() => {
      if (this.agendamentoForm.get('telefone')?.valid) {
        this.verificarTelefoneDuplicado();
      } else {
        this.duplicataErrors.telefone = false;
        this.atualizarMensagemDuplicata();
      }
    });
  }

  onSubmit(): void {
    if (this.agendamentoForm.invalid) {
      this.agendamentoForm.markAllAsTouched();
      return;
    }

    this.carregando = true;
    this.mensagem = '';
    this.cliente.nome = this.agendamentoForm.get('nome')?.value;
    this.cliente.telefone = this.agendamentoForm.get('telefone')?.value?.replace(/\D/g, '') || ''; // Remove formatação
    this.cliente.email = this.agendamentoForm.get('email')?.value;
    
    // Usar a data exatamente como veio do input, sem conversão
    const dataValue = this.agendamentoForm.get('data_agendada')?.value;
    const horaValue = this.agendamentoForm.get('hora_agendada')?.value;
    
    if (dataValue) {
      // Usar a data diretamente do input, já está no formato YYYY-MM-DD
      this.agendamento.data_agendada = dataValue;
      
      // Logs para depuração
      console.log('Data do formulário (input):', dataValue);
      console.log('Hora do formulário (input):', horaValue);
      console.log('Data que será enviada para o backend:', this.agendamento.data_agendada);
    } else {
      this.agendamento.data_agendada = '';
    }
    
    this.agendamento.hora_agendada = horaValue || '';
    this.agendamento.servico_id = this.agendamentoForm.get('servico_id')?.value || 0;
    this.agendamento.observacoes = this.agendamentoForm.get('observacoes')?.value || '';

    // Primeiro, verificar a disponibilidade do horário
    if (!dataValue || !horaValue) {
      this.mensagem = 'Data e horário são obrigatórios';
      this.mensagemTipo = 'erro';
      this.carregando = false;
      return;
    }

    this.dbService.verificarHorarioDisponivel(dataValue, horaValue).subscribe({
      next: (response) => {
        if (!response?.disponivel) {
          this.mensagem = 'Este horário já está ocupado. Por favor, escolha outro horário.';
          this.mensagemTipo = 'erro';
          this.carregando = false;
          return;
        }
        
        // Se o horário estiver disponível, criar o cliente
        this.criarClienteEAprovarAgendamento();
      },
      error: (err) => {
        console.error('Erro ao verificar disponibilidade:', err);
        let errorMessage = 'Erro ao verificar disponibilidade. ';
        
        if (err?.error?.message) {
          errorMessage += err.error.message;
        } else if (err?.message) {
          errorMessage += err.message;
        }
        
        this.mensagem = errorMessage;
        this.mensagemTipo = 'erro';
        this.carregando = false;
      }
    });
  }

  // Método separado para criar o cliente e aprovar o agendamento
  private criarClienteEAprovarAgendamento(): void {
    this.dbService.addCliente(this.cliente).subscribe({
      next: (clienteResponse) => {
        // Depois de criar o cliente, criar o agendamento
        this.agendamento.cliente_id = clienteResponse.id || 0;
        
        this.dbService.createAgendamento(this.agendamento).subscribe({
          next: () => {
            this.mensagem = 'Pacto selado com sucesso! Seu horário está confirmado.';
            this.mensagemTipo = 'sucesso';
            this.limparFormulario();
            this.carregando = false;
          },
          error: (err) => {
            console.error('Erro ao criar agendamento:', err);
            let errorMessage = 'As entidades do além rejeitaram seu agendamento. ';
            
            // Adicionar mensagens de erro mais específicas com base no código de erro ou mensagem
            if (err?.error?.error === 'Horário já está ocupado') {
              errorMessage = 'Este horário já foi reservado. Por favor, escolha outro horário.';
            } else if (err?.error?.error === 'Limite de agendamentos para este dia') {
              errorMessage = 'Todos os horários para este dia já estão preenchidos. Por favor, escolha outra data.';
            } else if (err?.error?.details) {
              errorMessage += `Detalhes: ${err.error.details}`;
            } else if (err?.message) {
              errorMessage += `Detalhes: ${err.message}`;
            }
            
            this.mensagem = errorMessage;
            this.mensagemTipo = 'erro';
            this.carregando = false;
          }
        });
      },
      error: (err) => {
        console.error('Erro ao criar cliente:', err);
        let errorMessage = 'Erro ao processar os dados do cliente. ';
        
        if (err?.error?.message) {
          errorMessage += err.error.message;
        } else if (err?.message) {
          errorMessage += err.message;
        }
        
        this.mensagem = errorMessage;
        this.mensagemTipo = 'erro';
        this.carregando = false;
      }
    });
  }

  limparFormulario(): void {
    this.agendamentoForm.reset();
    this.duplicataErrors = {
      nome: false,
      email: false,
      telefone: false,
      mensagem: ''
    };
    
    this.cliente = {
      nome: '',
      email: '',
      telefone: ''
    };

    this.agendamento = {
      cliente_id: 0,
      servico_id: 0,
      data_agendada: '',
      hora_agendada: '',
      observacoes: ''
    };
    
    this.agendamentosDoDia = [];
    this.dataBloqueada = false;
  }
  
  // Métodos auxiliares para validação no template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.agendamentoForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }
  
  getErrorMessage(fieldName: string): string {
    const field = this.agendamentoForm.get(fieldName);
    if (!field) return '';
    
    if (field.hasError('required')) return 'Este campo é obrigatório';
    if (field.hasError('minlength')) return 'Informação muito curta';
    if (field.hasError('maxlength')) return 'Máximo de 35 caracteres permitidos';
    if (field.hasError('email')) return 'E-mail inválido';
    if (field.hasError('hasNumber')) return 'Não pode conter números';
    if (field.hasError('nomeIncompleto')) return 'Digite nome e sobrenomes completos';
    if (field.hasError('sequenciaInvalida')) return 'Nome não pode conter sequências ou repetições';
    if (field.hasError('nomeIrreal')) return 'Por favor, digite um nome real válido';
    if (field.hasError('telefoneInvalido')) return 'Telefone inválido';
    if (field.hasError('telefoneSequencial')) return 'Telefone não pode ter sequências ou muitas repetições';
    if (field.hasError('emailInseguro')) return 'Email não pode conter sequências ou repetições excessivas';
    if (field.hasError('dataPassada')) return 'Não é possível agendar para datas passadas';
    
    return 'Campo inválido';
  }
  
  // Bloqueia números no campo de nome
  onlyLettersInput(event: KeyboardEvent): boolean {
    const pattern = /[A-Za-zÀ-ÖØ-öø-ÿ\s]$/;
    const inputChar = String.fromCharCode(event.charCode);
    
    if (!pattern.test(inputChar)) {
      event.preventDefault();
      return false;
    }
    return true;
  }
  
  // Formata o telefone automaticamente no padrão (XX) XXXXX-XXXX
  onlyNumbersInput(event: KeyboardEvent): boolean {
    // Permite apenas números
    if (!/^\d$/.test(String.fromCharCode(event.charCode)) && event.charCode !== 0) {
      event.preventDefault();
      return false;
    }
    
    return true;
  }

  onTelefoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, ''); // Remove não-dígitos
    
    if (value.length <= 11) {
      let formattedValue = '';
      
      if (value.length > 0) formattedValue = '(' + value.substring(0, 2);
      if (value.length > 2) formattedValue += ') ' + value.substring(2, 7);
      if (value.length > 7) formattedValue += '-' + value.substring(7, 11);
      
      // Atualiza o valor do campo e do FormControl
      input.value = formattedValue;
      this.agendamentoForm.get('telefone')?.setValue(formattedValue, {emitEvent: false});
      
      // Verificar duplicata automaticamente quando atingir 11 dígitos
      if (value.length === 11) {
        setTimeout(() => this.verificarTelefoneDuplicado(), 500); // Delay para não sobrecarregar
      }
    }
  }
}