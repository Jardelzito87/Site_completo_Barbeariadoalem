const { Pool } = require('pg');
require('dotenv').config();

async function checkTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Conectando ao banco de dados...');
    const client = await pool.connect();
    
    console.log('Verificando tabelas existentes...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\nTabelas encontradas:');
    if (tables.rows.length === 0) {
      console.log('Nenhuma tabela encontrada. O banco de dados está vazio.');
    } else {
      tables.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }
    
    // Verificar estrutura das tabelas
    if (tables.rows.some(row => row.table_name === 'clientes')) {
      console.log('\nEstrutura da tabela clientes:');
      const clientesColumns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'clientes'
        ORDER BY ordinal_position
      `);
      clientesColumns.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    if (tables.rows.some(row => row.table_name === 'agendamentos')) {
      console.log('\nEstrutura da tabela agendamentos:');
      const agendamentosColumns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'agendamentos'
        ORDER BY ordinal_position
      `);
      agendamentosColumns.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    // Verificar dados existentes
    if (tables.rows.some(row => row.table_name === 'servicos')) {
      console.log('\nServiços cadastrados:');
      const servicos = await client.query('SELECT * FROM servicos');
      if (servicos.rows.length === 0) {
        console.log('Nenhum serviço cadastrado.');
      } else {
        servicos.rows.forEach(servico => {
          console.log(`- ID ${servico.id}: ${servico.nome} (R$ ${servico.preco})`);
        });
      }
    }
    
    if (tables.rows.some(row => row.table_name === 'clientes')) {
      console.log('\nQuantidade de clientes cadastrados:');
      const clientesCount = await client.query('SELECT COUNT(*) FROM clientes');
      console.log(`Total: ${clientesCount.rows[0].count} cliente(s)`);
    }
    
    if (tables.rows.some(row => row.table_name === 'agendamentos')) {
      console.log('\nQuantidade de agendamentos cadastrados:');
      const agendamentosCount = await client.query('SELECT COUNT(*) FROM agendamentos');
      console.log(`Total: ${agendamentosCount.rows[0].count} agendamento(s)`);
    }
    
    client.release();
  } catch (err) {
    console.error('Erro ao verificar tabelas:', err);
  } finally {
    await pool.end();
  }
}

checkTables();