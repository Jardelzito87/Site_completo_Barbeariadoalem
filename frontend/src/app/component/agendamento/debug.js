// Adicione este código temporariamente ao agendamento.component.ts para depuração
console.log('Carregando serviços...');
this.dbService.getServicos().subscribe({
  next: (data) => {
    console.log('Serviços recebidos:', data);
    this.servicos = data;
    this.carregando = false;
  },
  error: (err) => {
    console.error('Erro ao carregar serviços:', err);
    this.mensagem = 'O grimório de serviços está temporariamente inacessível. Os espíritos estão trabalhando para resolver o problema.';
    this.mensagemTipo = 'erro';
    this.carregando = false;
  }
});