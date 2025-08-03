// Adicione este código temporariamente ao início do método carregarServicos() para depuração
console.log('=== DEPURAÇÃO DE SERVIÇOS ===');
console.log('Componente inicializado, carregando serviços...');

// Verificar se o serviço está sendo injetado corretamente
console.log('Serviço de banco de dados:', this.dbService);

// Usar serviços fixos garantidos
this.servicos = [
  { id: 1, nome: 'Corte Sobrenatural', descricao: 'Transformação completa com técnicas ancestrais', preco: 45.00 },
  { id: 2, nome: 'Degradê Espectral', descricao: 'Fade perfeito com transições invisíveis', preco: 55.00 },
  { id: 3, nome: 'Navalha Demoníaca', descricao: 'Precisão sobrenatural com nossa navalha ritual', preco: 65.00 },
  { id: 4, nome: 'Barba Maldita', descricao: 'Modelagem completa da barba com produtos infernais', preco: 40.00 },
  { id: 5, nome: 'Pacto Completo', descricao: 'Combo de corte e barba com direito a ritual completo', preco: 90.00 },
  { id: 6, nome: 'Transformação Sombria', descricao: 'Mudança radical de visual com coloração', preco: 120.00 }
];