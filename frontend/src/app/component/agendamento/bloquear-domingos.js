// Função para bloquear todos os domingos no calendário
function bloquearDomingos() {
  // Obter o elemento de input de data
  const inputData = document.getElementById('data');
  
  if (!inputData) return;
  
  // Adicionar um evento para quando o usuário selecionar uma data
  inputData.addEventListener('input', function() {
    const dateValue = this.value;
    if (!dateValue) return;
    
    // Criar data no fuso horário local
    const dateParts = dateValue.split('-');
    if (dateParts.length === 3) {
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // Mês é 0-indexado
      const day = parseInt(dateParts[2]);
      // Data processada no fuso horário local
      const dataEscolhida = new Date(year, month, day);
    }
  });
  
  // Configurar o atributo min para evitar datas passadas
  const hoje = new Date();
  const dd = String(hoje.getDate()).padStart(2, '0');
  const mm = String(hoje.getMonth() + 1).padStart(2, '0'); // Janeiro é 0!
  const yyyy = hoje.getFullYear();
  const dataMinima = yyyy + '-' + mm + '-' + dd;
  inputData.setAttribute('min', dataMinima);
}

// Executar a função quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', bloquearDomingos);