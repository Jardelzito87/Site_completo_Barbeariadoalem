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
    // Ler o arquivo SQL
    const sql = fs.readFileSync('./init-db.sql', 'utf8');
    
    // Conectar ao banco de dados
    client = await pool.connect();
    
    console.log('Conexão estabelecida com sucesso!');
    console.log('Executando script SQL...');
    
    // Executar o script SQL
    await client.query(sql);
    
    // Verificar se as tabelas foram criadas
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\nTabelas criadas:');
    tables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Verificar os serviços inseridos
    const servicos = await client.query('SELECT * FROM servicos');
    
    console.log('\nServiços disponíveis:');
    servicos.rows.forEach(servico => {
      console.log(`- ${servico.nome}: R$ ${servico.preco}`);
    });
    
    console.log('\nBanco de dados configurado com sucesso!');
  } catch (err) {
    console.error('Erro ao configurar o banco de dados:', err);
    
    // Tentar obter mais informações sobre o erro
    if (client) {
      try {
        // Verificar se as tabelas existem
        const tablesCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'servicos'
          ) as servicos_exists,
          EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'clientes'
          ) as clientes_exists,
          EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'agendamentos'
          ) as agendamentos_exists,
          EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'datas_bloqueadas'
          ) as datas_bloqueadas_exists
        `);
        
        console.log('\nStatus das tabelas:');
        console.log(`- servicos: ${tablesCheck.rows[0].servicos_exists ? 'Existe' : 'Não existe'}`);
        console.log(`- clientes: ${tablesCheck.rows[0].clientes_exists ? 'Existe' : 'Não existe'}`);
        console.log(`- agendamentos: ${tablesCheck.rows[0].agendamentos_exists ? 'Existe' : 'Não existe'}`);
        console.log(`- datas_bloqueadas: ${tablesCheck.rows[0].datas_bloqueadas_exists ? 'Existe' : 'Não existe'}`);
        
        // Se a tabela de serviços existe, verificar os serviços
        if (tablesCheck.rows[0].servicos_exists) {
          const servicosCheck = await client.query('SELECT * FROM servicos');
          console.log('\nServiços existentes:');
          if (servicosCheck.rows.length === 0) {
            console.log('Nenhum serviço encontrado.');
          } else {
            servicosCheck.rows.forEach(servico => {
              console.log(`- ${servico.nome}: R$ ${servico.preco}`);
            });
          }
        }
      } catch (checkErr) {
        console.error('Erro ao verificar o estado do banco de dados:', checkErr);
      }
    }
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

setupDatabase();