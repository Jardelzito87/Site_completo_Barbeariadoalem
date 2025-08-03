const { Pool } = require('pg');
require('dotenv').config();

async function initializeData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  let client;
  try {
    console.log('Conectando ao banco de dados...');
    client = await pool.connect();

    // Inserir serviços padrão
    const servicosPadrao = [
      { nome: 'Corte Sobrenatural', descricao: 'Transformação completa com técnicas ancestrais. Inclui ritual de purificação capilar', preco: 45.00 },
      { nome: 'Degradê Espectral', descricao: 'Fade perfeito com transições invisíveis. Realizado com tesouras forjadas em metal do além', preco: 55.00 },
      { nome: 'Navalha Demoníaca', descricao: 'Precisão sobrenatural com nossa navalha ritual. Inclui massagem craniana com óleos místicos', preco: 65.00 },
      { nome: 'Barba Maldita', descricao: 'Modelagem completa da barba com produtos infernais. Inclui toalha quente e óleo de barba especial', preco: 40.00 },
      { nome: 'Pacto Completo', descricao: 'Combo de corte e barba com direito a ritual completo. Inclui bebida e tratamento especial', preco: 90.00 },
      { nome: 'Transformação Sombria', descricao: 'Mudança radical de visual com direito a coloração e tratamento capilar das trevas', preco: 120.00 }
    ];

    // Criar as tabelas se não existirem
    await client.query(`
      CREATE TABLE IF NOT EXISTS servicos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) UNIQUE NOT NULL,
        descricao TEXT,
        preco NUMERIC(7,2) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE,
        telefone VARCHAR(20) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS agendamentos (
        id SERIAL PRIMARY KEY,
        cliente_id INT NOT NULL,
        servico_id INT NOT NULL,
        data_agendada DATE NOT NULL,
        hora_agendada TIME NOT NULL,
        observacoes TEXT,
        status VARCHAR(30) DEFAULT 'pendente',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        alterado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (servico_id) REFERENCES servicos(id)
      );

      CREATE TABLE IF NOT EXISTS logs_agendamentos (
        id SERIAL PRIMARY KEY,
        agendamento_id INT,
        status_anterior VARCHAR(30),
        status_novo VARCHAR(30),
        alterado_por VARCHAR(100) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_agendada DATE,
        hora_agendada TIME,
        cliente_nome VARCHAR(100),
        FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS datas_bloqueadas (
        id SERIAL PRIMARY KEY,
        data DATE UNIQUE NOT NULL,
        motivo VARCHAR(255),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Inserir ou atualizar serviços
    for (const servico of servicosPadrao) {
      await client.query(
        `INSERT INTO servicos (nome, descricao, preco) 
         VALUES ($1, $2, $3)
         ON CONFLICT (nome) 
         DO UPDATE SET descricao = EXCLUDED.descricao, preco = EXCLUDED.preco`,
        [servico.nome, servico.descricao, servico.preco]
      );
    }

    console.log('Banco de dados inicializado com sucesso!');
    
    // Verificar dados
    const result = await client.query('SELECT * FROM servicos');
    console.log('\nServiços disponíveis:');
    result.rows.forEach(servico => {
      console.log(`- ${servico.nome}: R$ ${servico.preco}`);
    });

  } catch (err) {
    console.error('Erro ao inicializar banco de dados:', err);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

initializeData();
