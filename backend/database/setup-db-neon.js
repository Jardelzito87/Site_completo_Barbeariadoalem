const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  let client;
  try {
    console.log('Conectando ao banco de dados Neon...');
    client = await pool.connect();
    console.log('Conexão estabelecida com sucesso!');
    
    // Ler os arquivos SQL
    const initSql = fs.readFileSync('./init-db.sql', 'utf8');
    const migrateSql = fs.readFileSync('./migrate-db.sql', 'utf8');
    console.log('Arquivos SQL lidos com sucesso.');
    
    // Executar os scripts SQL
    console.log('Executando scripts SQL...');
    
    // Criar backup dos dados existentes e executar migração
    console.log('Fazendo backup e migrando dados...');
    await client.query(migrateSql);
    
    // Executar script de inicialização (agora seguro pois dados foram preservados)
    console.log('Atualizando estrutura do banco...');
    await client.query(initSql);
    
    console.log('Scripts SQL executados com sucesso!');
    
    // Verificar tabelas criadas
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\nTabelas criadas:');
    tables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Verificar serviços inseridos
    const servicos = await client.query('SELECT * FROM servicos');
    console.log('\nServiços inseridos:');
    servicos.rows.forEach(servico => {
      console.log(`- ${servico.id}: ${servico.nome} (R$ ${servico.preco})`);
    });
    
    console.log('\nBanco de dados configurado com sucesso!');
  } catch (err) {
    console.error('Erro ao configurar o banco de dados:', err);
    if (err.detail) {
      console.error('Detalhes do erro:', err.detail);
    }
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

setupDatabase();