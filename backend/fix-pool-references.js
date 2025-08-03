const fs = require('fs');
const path = require('path');

// Caminho do arquivo server.js
const serverPath = path.join(__dirname, 'src', 'server.js');

console.log('🔧 Corrigindo referências pool.query -> db.query no server.js...');

try {
  // Ler o arquivo
  let content = fs.readFileSync(serverPath, 'utf8');
  
  // Substituir todas as ocorrências de pool.query por db.query
  const beforeCount = (content.match(/pool\.query/g) || []).length;
  content = content.replace(/pool\.query/g, 'db.query');
  const afterCount = (content.match(/pool\.query/g) || []).length;
  
  // Escrever o arquivo
  fs.writeFileSync(serverPath, content, 'utf8');
  
  console.log(`✅ Correção aplicada!`);
  console.log(`📊 Substituições: ${beforeCount - afterCount} ocorrências corrigidas`);
  
  if (afterCount === 0) {
    console.log('🎉 Todos os pool.query foram substituídos por db.query');
  } else {
    console.log(`⚠️ Ainda restam ${afterCount} ocorrências (verificar manualmente)`);
  }
  
} catch (error) {
  console.error('❌ Erro ao corrigir arquivo:', error.message);
}
