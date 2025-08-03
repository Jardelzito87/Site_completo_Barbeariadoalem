const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');

// Garantir que dotenv seja carregado
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Importar configurações centralizadas
const config = require('../config');
const db = require('./database');

const app = express();

// Configurar CORS usando configurações centralizadas
app.use(cors(config.cors));

// Middleware adicional para debug de CORS
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.get('Origin') || 'none'}`);
  
  // Headers adicionais para garantir CORS
  res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.static(config.paths.public)); // Servir arquivos estáticos

// Configurar sessões usando PostgreSQL como store
app.use(session({
  store: new pgSession({
    pool: db.pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: config.security.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // true em produção com HTTPS
    maxAge: 2 * 60 * 60 * 1000 // 2 horas
  }
}));

// Ping para manter Neon ativo
setInterval(async () => {
  try {
    await db.query('SELECT 1');
    console.log('⏱️ Ping Neon DB - OK');
  } catch (err) {
    console.error('❌ Erro ao pingar banco:', err);
  }
}, 5 * 60 * 1000); // 5 minutos

// Rota raiz - Redirecionar para frontend
app.get('/', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.redirect(frontendUrl);
  }

  res.json({
    name: 'Barbearia do Além API',
    version: '2.0.0',
    status: 'online',
    endpoints: {
      frontend: frontendUrl,
      admin: `${frontendUrl}/admin`,
      login: `${frontendUrl}/login`,
      docs: `${req.protocol}://${req.get('host')}/docs`
    },
    api: {
      servicos: 'GET /api/servicos',
      agendamentos: 'GET /api/agendamentos',
      clientes: 'POST /api/clientes',
      auth: 'POST /api/admin/login'
    }
  });
});

// Rota para documentação da API
app.get('/docs', (req, res) => {
  res.sendFile(path.join(config.paths.public, 'api-docs.html'));
});

// Testar conexão ao iniciar
async function testConnection() {
  try {
    const isConnected = await db.testConnection();
    if (isConnected) {
      console.log('✅ Conexão com o banco de dados estabelecida!');
      return true;
    }
    return false;
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err);
    return false;
  }
}

// Limpar todas as sessões ativas ao reiniciar o servidor
async function limparSessoesAtivas() {
  try {
    console.log('🔄 Limpando todas as sessões ativas devido ao reinício do servidor...');
    
    // Contar sessões ativas antes da limpeza
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM sessoes_admin WHERE expira_em > CURRENT_TIMESTAMP'
    );
    const sessoesAtivas = parseInt(countResult.rows[0].total);
    
    // Limpar todas as sessões (ativas e expiradas)
    const deleteResult = await db.query('DELETE FROM sessoes_admin');
    
    if (sessoesAtivas > 0) {
      console.log(`✅ ${sessoesAtivas} sessão(ões) ativa(s) foram invalidadas`);
      console.log('📋 Todos os administradores precisarão fazer login novamente');
    } else {
      console.log('✅ Nenhuma sessão ativa encontrada');
    }
    
    console.log(`🗑️ Total de ${deleteResult.rowCount} registro(s) removidos da tabela de sessões`);
    
  } catch (err) {
    console.error('❌ Erro ao limpar sessões ativas:', err);
  }
}

// Middleware para verificar autenticação
function verificarAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer token
  
  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }
  
  try {
    const decoded = jwt.verify(token, config.security.jwtSecret);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// POST - Login administrativo
app.post('/api/admin/login', async (req, res) => {
  const { email, senha } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || '';
  
  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }
  
  try {
    // Buscar administrador
    const adminResult = await db.query(
      'SELECT * FROM administradores WHERE email = $1 AND ativo = true',
      [email]
    );
    
    if (adminResult.rows.length === 0) {
      // Log da tentativa falhada (sem admin_id, vamos pular o log)
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const admin = adminResult.rows[0];
    
    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, admin.senha_hash);
    
    if (!senhaValida) {
      // Log da tentativa falhada
      await db.query(
        'INSERT INTO logs_login (admin_id, ip_address, user_agent, sucesso) VALUES ($1, $2, $3, false)',
        [admin.id, ipAddress, userAgent]
      );
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar se já existe uma sessão ativa para este admin
    const sessaoAtivaResult = await db.query(
      'SELECT * FROM sessoes_admin WHERE admin_id = $1 AND expira_em > CURRENT_TIMESTAMP',
      [admin.id]
    );
    
    if (sessaoAtivaResult.rows.length > 0) {
      // Existe uma sessão ativa
      const sessaoAtiva = sessaoAtivaResult.rows[0];
      
      // Log da tentativa de login duplo
      await db.query(
        'INSERT INTO logs_login (admin_id, ip_address, user_agent, sucesso) VALUES ($1, $2, $3, false)',
        [admin.id, ipAddress, userAgent]
      );
      
      return res.status(409).json({ 
        error: 'Já existe uma sessão ativa para este administrador',
        details: {
          existingSessionCreated: sessaoAtiva.criado_em,
          existingSessionExpires: sessaoAtiva.expira_em,
          message: 'Faça logout da sessão atual ou aguarde a expiração'
        }
      });
    }

    // Limpar sessões expiradas do admin antes de criar nova
    await db.query(
      'DELETE FROM sessoes_admin WHERE admin_id = $1 AND expira_em <= CURRENT_TIMESTAMP',
      [admin.id]
    );
    
    // Gerar JWT token
    const token = jwt.sign(
      { 
        adminId: admin.id, 
        email: admin.email, 
        nome: admin.nome,
        nivelAcesso: admin.nivel_acesso 
      },
      config.security.jwtSecret,
      { expiresIn: '24h' }
    );
    
    // Atualizar último login
    await db.query(
      'UPDATE administradores SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1',
      [admin.id]
    );
    
    // Log da tentativa bem-sucedida
    await db.query(
      'INSERT INTO logs_login (admin_id, ip_address, user_agent, sucesso) VALUES ($1, $2, $3, true)',
      [admin.id, ipAddress, userAgent]
    );

    // Calcular data de expiração (24 horas)
    const expiraEm = new Date();
    expiraEm.setHours(expiraEm.getHours() + 24);

    // Criar uma hash do token para armazenar (JWT é muito longo para o campo)
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex').substring(0, 64);

    // Armazenar sessão na tabela sessoes_admin
    await db.query(
      'INSERT INTO sessoes_admin (admin_id, token, ip_address, user_agent, expira_em) VALUES ($1, $2, $3, $4, $5)',
      [admin.id, tokenHash, ipAddress, userAgent, expiraEm]
    );
    
    // Armazenar sessão express
    req.session.adminId = admin.id;
    req.session.admin = {
      id: admin.id,
      nome: admin.nome,
      email: admin.email,
      nivelAcesso: admin.nivel_acesso
    };
    
    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        nivelAcesso: admin.nivel_acesso,
        ultimoLogin: admin.ultimo_login
      }
    });
    
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Logout administrativo
app.post('/api/admin/logout', verificarAuth, async (req, res) => {
  try {
    const adminId = req.admin.adminId;
    
    // Remover sessão da tabela sessoes_admin
    await db.query(
      'DELETE FROM sessoes_admin WHERE admin_id = $1',
      [adminId]
    );
    
    // Limpar sessão express
    req.session.destroy((err) => {
      if (err) {
        console.error('Erro ao destruir sessão:', err);
      }
    });
    
    res.json({ success: true, message: 'Logout realizado com sucesso' });
  } catch (err) {
    console.error('Erro no logout:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Listar administradores
app.get('/api/admins', (req, res, next) => {
  console.log('🔍 GET /api/admins - Headers:', req.headers);
  console.log('🔍 Authorization:', req.headers.authorization);
  next();
}, verificarAuth, async (req, res) => {
  try {
    console.log('✅ Buscando administradores no banco...');
    const result = await db.query(
      'SELECT id, nome, email, nivel_acesso, ativo, criado_em, ultimo_login FROM administradores ORDER BY nome'
    );
    console.log('📊 Administradores encontrados:', result.rows.length);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Erro ao listar admins:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Criar novo administrador
app.post('/api/admins', verificarAuth, async (req, res) => {
  const { nome, email, nivel_acesso } = req.body;
  const senha = 'admin123';
  
  if (!nome || !email || !nivel_acesso) {
    return res.status(400).json({ error: 'Nome, email e nível de acesso são obrigatórios' });
  }
  
  try {
    const emailExiste = await db.query(
      'SELECT id FROM administradores WHERE email = $1',
      [email]
    );
    
    if (emailExiste.rows.length > 0) {
      return res.status(400).json({ error: 'Email já está em uso' });
    }
    
    const senhaHash = await bcrypt.hash(senha, config.security.saltRounds);
    
    const result = await db.query(
      'INSERT INTO administradores (nome, email, senha_hash, nivel_acesso) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, nivel_acesso, ativo, criado_em',
      [nome, email, senhaHash, nivel_acesso]
    );
    
    res.status(201).json({
      admin: result.rows[0],
      senhaTemporaria: senha
    });
  } catch (err) {
    console.error('Erro ao criar admin:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT - Alterar senha do administrador
app.put('/api/admins/:id/senha', verificarAuth, async (req, res) => {
  const { id } = req.params;
  const { senhaAtual, novaSenha } = req.body;
  
  if (!senhaAtual || !novaSenha) {
    return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
  }
  
  try {
    const adminResult = await db.query(
      'SELECT * FROM administradores WHERE id = $1',
      [id]
    );
    
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ error: 'Administrador não encontrado' });
    }
    
    const admin = adminResult.rows[0];
    const senhaValida = await bcrypt.compare(senhaAtual, admin.senha_hash);
    
    if (!senhaValida) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }
    
    const novaSenhaHash = await bcrypt.hash(novaSenha, config.security.saltRounds);
    
    await db.query(
      'UPDATE administradores SET senha_hash = $1 WHERE id = $2',
      [novaSenhaHash, id]
    );
    
    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Verificar status de autenticação
app.get('/api/admin/status', verificarAuth, async (req, res) => {
  try {
    const adminResult = await db.query(
      'SELECT id, nome, email, nivel_acesso, ultimo_login FROM administradores WHERE id = $1',
      [req.admin.adminId]
    );
    
    if (adminResult.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    
    res.json({
      authenticated: true,
      admin: adminResult.rows[0]
    });
  } catch (err) {
    console.error('Erro ao verificar status:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET para listar serviços
app.get('/api/servicos', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM servicos');
    console.log('Serviços encontrados:', result.rows);
    
    // Se não houver serviços no banco, retornar serviços padrão
    if (result.rows.length === 0) {
      console.log('Nenhum serviço encontrado, retornando serviços padrão');
      const servicosPadrao = [
        { id: 1, nome: 'Corte Sobrenatural', descricao: 'Transformação completa com técnicas ancestrais. Inclui ritual de purificação capilar', preco: 45.00 },
        { id: 2, nome: 'Degradê Espectral', descricao: 'Fade perfeito com transições invisíveis. Realizado com tesouras forjadas em metal do além', preco: 55.00 },
        { id: 3, nome: 'Navalha Demoníaca', descricao: 'Precisão sobrenatural com nossa navalha ritual. Inclui massagem craniana com óleos místicos', preco: 65.00 },
        { id: 4, nome: 'Barba Maldita', descricao: 'Modelagem completa da barba com produtos infernais. Inclui toalha quente e óleo de barba especial', preco: 40.00 },
        { id: 5, nome: 'Pacto Completo', descricao: 'Combo de corte e barba com direito a ritual completo. Inclui bebida e tratamento especial', preco: 90.00 },
        { id: 6, nome: 'Transformação Sombria', descricao: 'Mudança radical de visual com direito a coloração e tratamento capilar das trevas', preco: 120.00 }
      ];
      return res.json(servicosPadrao);
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar serviços:', err);
    console.log('Retornando serviços padrão devido ao erro');
    
    // Em caso de erro, retornar serviços padrão
    const servicosPadrao = [
      { id: 1, nome: 'Corte Sobrenatural', descricao: 'Transformação completa com técnicas ancestrais. Inclui ritual de purificação capilar', preco: 45.00 },
      { id: 2, nome: 'Degradê Espectral', descricao: 'Fade perfeito com transições invisíveis. Realizado com tesouras forjadas em metal do além', preco: 55.00 },
      { id: 3, nome: 'Navalha Demoníaca', descricao: 'Precisão sobrenatural com nossa navalha ritual. Inclui massagem craniana com óleos místicos', preco: 65.00 },
      { id: 4, nome: 'Barba Maldita', descricao: 'Modelagem completa da barba com produtos infernais. Inclui toalha quente e óleo de barba especial', preco: 40.00 },
      { id: 5, nome: 'Pacto Completo', descricao: 'Combo de corte e barba com direito a ritual completo. Inclui bebida e tratamento especial', preco: 90.00 },
      { id: 6, nome: 'Transformação Sombria', descricao: 'Mudança radical de visual com direito a coloração e tratamento capilar das trevas', preco: 120.00 }
    ];
    res.json(servicosPadrao);
  }
});

// Rota de teste para serviços
app.get('/api/servicos-teste', (req, res) => {
  const servicosTeste = [
    { id: 1, nome: 'Corte Sobrenatural', descricao: 'Transformação completa com técnicas ancestrais. Inclui ritual de purificação capilar', preco: 45.00 },
    { id: 2, nome: 'Degradê Espectral', descricao: 'Fade perfeito com transições invisíveis. Realizado com tesouras forjadas em metal do além', preco: 55.00 },
    { id: 3, nome: 'Navalha Demoníaca', descricao: 'Precisão sobrenatural com nossa navalha ritual. Inclui massagem craniana com óleos místicos', preco: 65.00 },
    { id: 4, nome: 'Barba Maldita', descricao: 'Modelagem completa da barba com produtos infernais. Inclui toalha quente e óleo de barba especial', preco: 40.00 },
    { id: 5, nome: 'Pacto Completo', descricao: 'Combo de corte e barba com direito a ritual completo. Inclui bebida e tratamento especial', preco: 90.00 },
    { id: 6, nome: 'Transformação Sombria', descricao: 'Mudança radical de visual com direito a coloração e tratamento capilar das trevas', preco: 120.00 }
  ];
  res.json(servicosTeste);
});

// GET para listar clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clientes ORDER BY nome');
    console.log('Clientes encontrados:', result.rows.length);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar clientes:', err);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

// GET para listar logs de agendamentos
app.get('/api/logs-agendamentos', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        l.id,
        l.agendamento_id,
        l.status_anterior,
        l.status_novo,
        l.alterado_por,
        CASE 
          WHEN l.data_agendada IS NOT NULL THEN TO_CHAR(l.data_agendada, 'YYYY-MM-DD')
          ELSE TO_CHAR(a.data_agendada, 'YYYY-MM-DD')
        END as data_agendada,
        CASE 
          WHEN l.hora_agendada IS NOT NULL THEN l.hora_agendada::text
          ELSE TO_CHAR(a.hora_agendada, 'HH24:MI:SS')
        END as hora_agendada,
        COALESCE(l.cliente_nome, c.nome, 'Cliente removido') as cliente_nome,
        TO_CHAR(l.criado_em, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as criado_em
      FROM logs_agendamentos l
      LEFT JOIN agendamentos a ON l.agendamento_id = a.id
      LEFT JOIN clientes c ON a.cliente_id = c.id
      ORDER BY l.criado_em DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar logs de agendamentos:', err);
    res.status(500).json({ error: 'Erro ao buscar logs de agendamentos' });
  }
});

// POST para verificar duplicatas de cliente
// Modificado para sempre retornar que não há duplicatas, permitindo múltiplos clientes
// com mesmo email, nome ou telefone
app.post('/api/clientes/verificar-duplicata', async (req, res) => {
  console.log('🔍 Verificação de duplicatas desativada - permitindo múltiplos agendamentos');
  
  // Sempre retorna que não há duplicatas
  const duplicatas = {
    nome: false,
    email: false,
    telefone: false,
    cliente: null
  };
  
  console.log('📋 Resultado verificação duplicatas (sempre sem duplicatas):', duplicatas);
  res.json(duplicatas);
});

// POST para criar cliente
app.post('/api/clientes', async (req, res) => {
  console.log('🔍 POST /api/clientes - Dados recebidos:', req.body);
  let { nome, email, telefone } = req.body;

  if (!nome || !email || !telefone) {
    console.log('❌ Campos obrigatórios ausentes:', { nome: !!nome, email: !!email, telefone: !!telefone });
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }

  // Limpar formatação do telefone (remover parênteses, espaços e hífens)
  const telefoneOriginal = telefone;
  telefone = telefone.replace(/\D/g, ''); // Remove todos os caracteres não numéricos
  console.log('📱 Telefone formatado:', { original: telefoneOriginal, limpo: telefone });

  try {
    // Verificar se já existe um cliente com este email
    console.log('🔍 Verificando se o cliente já existe pelo email:', email);
    const clienteExistente = await db.query(
      'SELECT * FROM clientes WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (clienteExistente.rows.length > 0) {
      // Cliente já existe, retornar o existente
      console.log('ℹ️ Usando cliente existente:', clienteExistente.rows[0]);
      return res.status(200).json(clienteExistente.rows[0]);
    }
    
    // Se não existir, criar novo cliente
    console.log('💾 Inserindo novo cliente:', { nome, email, telefone });
    const result = await db.query(
      'INSERT INTO clientes (nome, email, telefone) VALUES ($1, $2, $3) RETURNING *',
      [nome, email, telefone]
    );
    console.log('✅ Cliente criado com sucesso:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Erro ao criar/verificar cliente:', err);
    console.error('📋 Detalhes do erro:', err.detail || err.message);
    console.error('📋 Código do erro:', err.code);
    
    // Se for erro de chave duplicada, tentar novamente buscar o cliente existente
    if (err.code === '23505' && err.constraint === 'clientes_email_key') {
      console.log('⚠️ Tentando recuperar cliente existente após falha de chave duplicada');
      try {
        const clienteExistente = await db.query(
          'SELECT * FROM clientes WHERE LOWER(email) = LOWER($1)',
          [email]
        );
        
        if (clienteExistente.rows.length > 0) {
          console.log('✅ Cliente recuperado com sucesso após falha de chave duplicada:', clienteExistente.rows[0]);
          return res.status(200).json(clienteExistente.rows[0]);
        }
      } catch (recoveryErr) {
        console.error('❌ Erro ao tentar recuperar cliente existente:', recoveryErr);
      }
    }
    
    res.status(500).json({ 
      error: 'Erro ao processar cliente',
      details: err.detail || err.message,
      code: err.code
    });
  }
});

// POST para criar agendamento
app.post('/api/agendamentos', async (req, res) => {
  try {
    console.log('Recebido POST para /api/agendamentos:', req.body);
    const { cliente_id, servico_id, data_agendada, hora_agendada, observacoes } = req.body;
    
    console.log('=== DEBUG DATA TIMEZONE ===');
    console.log('Data recebida do frontend (string):', data_agendada);
    console.log('Tipo da data:', typeof data_agendada);
    console.log('Data que será usada no banco de dados (sem conversão):', data_agendada);
    console.log('=== FIM DEBUG DATA ===');
    
    // Verificar campos obrigatórios
    if (!cliente_id || !servico_id || !data_agendada || !hora_agendada) {
      console.log('Campos obrigatórios ausentes:', { cliente_id, servico_id, data_agendada, hora_agendada });
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    }

    // Verificar se o cliente existe
    console.log('Verificando se o cliente existe:', cliente_id);
    const clienteExiste = await db.query('SELECT id FROM clientes WHERE id = $1', [cliente_id]);
    if (clienteExiste.rows.length === 0) {
      console.log('Cliente não encontrado');
      return res.status(400).json({ error: 'Cliente não encontrado' });
    }

    // Verificar se o serviço existe
    console.log('Verificando se o serviço existe:', servico_id);
    const servicoExiste = await db.query('SELECT id FROM servicos WHERE id = $1', [servico_id]);
    if (servicoExiste.rows.length === 0) {
      console.log('Serviço não encontrado');
      return res.status(400).json({ error: 'Serviço não encontrado' });
    }

    // Verificar se a data está bloqueada
    console.log('Verificando se a data está bloqueada:', data_agendada);
    const dataBloqueada = await db.query('SELECT * FROM datas_bloqueadas WHERE data = $1', [data_agendada]);
    if (dataBloqueada.rows.length > 0) {
      console.log('Data bloqueada encontrada:', dataBloqueada.rows[0]);
      const motivo = dataBloqueada.rows[0].motivo || 'Data indisponível';
      return res.status(400).json({ 
        error: `Esta data está bloqueada para agendamentos. Motivo: ${motivo}` 
      });
    }

    // Verificar se já existe agendamento no mesmo horário
    const agendamentoExistente = await db.query(
      "SELECT * FROM agendamentos WHERE data_agendada = $1 AND hora_agendada = $2 AND status IN ('pendente', 'confirmado')",
      [data_agendada, hora_agendada]
    );
    
    if (agendamentoExistente.rows.length > 0) {
      console.log('Horário já ocupado');
      return res.status(400).json({ error: 'Horário já está ocupado' });
    }
    
    // Verificar limite de agendamentos por dia (7 no total)
    const { rows } = await db.query(
      "SELECT COUNT(*) as total FROM agendamentos WHERE data_agendada = $1 AND status IN ('pendente', 'confirmado')",
      [data_agendada]
    );
    
    const totalAgendamentos = parseInt(rows[0].total, 10);
    console.log(`Total de agendamentos para ${data_agendada}: ${totalAgendamentos}`);
    
    if (totalAgendamentos >= 7) {
      console.log('Limite de agendamentos para este dia atingido');
      return res.status(400).json({ 
        error: 'Limite de agendamentos para este dia atingido. Por favor, escolha outra data.' 
      });
    }

    console.log('=== DETALHES DA DATA NO BACKEND ===');
    console.log('Data recebida do frontend (string):', data_agendada);
    console.log('Data que será inserida no banco:', data_agendada);
    
    const result = await db.query(
      `INSERT INTO agendamentos 
       (cliente_id, servico_id, data_agendada, hora_agendada, observacoes, status) 
       VALUES ($1, $2, $3, $4, $5, 'pendente') 
       RETURNING *`,
      [cliente_id, servico_id, data_agendada, hora_agendada, observacoes || null]
    );
    
    console.log('Agendamento inserido com sucesso. Data armazenada:', result.rows[0].data_agendada);
    
    // Registrar no log
    await db.query(
      `INSERT INTO logs_agendamentos 
       (agendamento_id, status_anterior, status_novo, alterado_por, data_agendada, hora_agendada, cliente_nome) 
       VALUES ($1, NULL, 'pendente', 'sistema', $2, $3, 
         (SELECT nome FROM clientes WHERE id = $4))`,
      [result.rows[0].id, data_agendada, hora_agendada, cliente_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar agendamento:', err);
    console.error('Detalhes do erro:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro ao criar agendamento', detalhes: err.message });
    }
  }
});

// GET para verificar se um horário específico está disponível
app.get('/api/verificar-horario', async (req, res) => {
  console.log('🔍 GET /api/verificar-horario - Query params:', req.query);
  const { data, hora } = req.query;
  
  if (!data || !hora) {
    console.log('❌ Parâmetros ausentes:', { data, hora });
    return res.status(400).json({ error: 'Data e hora são obrigatórios' });
  }
  
  try {
    console.log(`🔍 Verificando disponibilidade para ${data} às ${hora}`);
    
    // Verificar se a data está bloqueada
    console.log('📅 Verificando se a data está bloqueada...');
    const dataBloqueada = await db.query('SELECT * FROM datas_bloqueadas WHERE data = $1', [data]);
    if (dataBloqueada.rows.length > 0) {
      console.log('🚫 Data bloqueada encontrada:', dataBloqueada.rows[0]);
      return res.json({ disponivel: false, motivo: 'Data bloqueada' });
    }
    console.log('✅ Data não está bloqueada');

    // Verificar se já existe um agendamento ativo para esta data e hora
    console.log('📋 Verificando agendamentos existentes...');
    const result = await db.query(
      `SELECT id FROM agendamentos 
       WHERE data_agendada = $1 
       AND hora_agendada = $2 
       AND status IN ('pendente', 'confirmado')`,
      [data, hora]
    );
    
    console.log(`📊 Encontrados ${result.rows.length} agendamentos ativos para ${data} ${hora}`);
    
    // Se não encontrar agendamentos ativos, o horário está disponível
    const disponivel = result.rows.length === 0;
    console.log(`✅ Horário ${disponivel ? 'disponível' : 'ocupado'}`);
    
    res.json({ disponivel });
  } catch (error) {
    console.error('❌ Erro ao verificar disponibilidade:', error);
    console.error('📋 Stack trace:', error.stack);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erro ao verificar disponibilidade',
        details: error.message 
      });
    }
  }
});

// GET para verificar disponibilidade de horários
app.get('/api/disponibilidade', async (req, res) => {
  const { data } = req.query;
  
  if (!data) {
    return res.status(400).json({ error: 'Data é obrigatória' });
  }
  
  try {
    // Definir horários disponíveis
    const horarios = [
      '09:00:00', '10:00:00', '11:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00'
    ];
    
    // Verificar se a data está bloqueada
    const dataBloqueada = await db.query('SELECT * FROM datas_bloqueadas WHERE data = $1', [data]);
    if (dataBloqueada.rows.length > 0) {
      // Se a data estiver bloqueada, todos os horários ficam indisponíveis
      const disponibilidade = horarios.map(horario => ({
        horario,
        disponivel: false,
        motivo: 'Data bloqueada'
      }));
      return res.json(disponibilidade);
    }

    // Buscar agendamentos para a data especificada
    // Apenas 'pendente' e 'confirmado' bloqueiam o horário
    const agendamentosResult = await db.query(
      `SELECT hora_agendada FROM agendamentos 
       WHERE data_agendada = $1 
       AND status IN ('pendente', 'confirmado')`,
      [data]
    );
    
    console.log(`Verificando disponibilidade para ${data} - Encontrados ${agendamentosResult.rows.length} horários ocupados`);
    
    // Mapear horários ocupados
    const horariosOcupados = agendamentosResult.rows.map(row => row.hora_agendada);
    
    // Criar lista de disponibilidade
    const disponibilidade = horarios.map(horario => ({
      horario,
      disponivel: !horariosOcupados.includes(horario)
    }));
    
    res.json(disponibilidade);
  } catch (err) {
    console.error('Erro ao verificar disponibilidade:', err);
    res.status(500).json({ error: 'Erro ao verificar disponibilidade' });
  }
});

// GET para listar agendamentos de uma data específica
app.get('/api/agendamentos-data', async (req, res) => {
  const { data } = req.query;
  
  if (!data) {
    return res.status(400).json({ error: 'Data é obrigatória' });
  }
  
  try {
    const result = await db.query(`
      SELECT 
        a.id,
        a.hora_agendada,
        a.status,
        c.id as cliente_id,
        c.nome as cliente_nome
      FROM agendamentos a
      JOIN clientes c ON a.cliente_id = c.id
      WHERE a.data_agendada = $1
      AND a.status IN ('pendente', 'confirmado')
      ORDER BY a.hora_agendada ASC
    `, [data]);
    
    // Verificar se a data está bloqueada e adicionar informação
    const dataBloqueada = await db.query('SELECT motivo FROM datas_bloqueadas WHERE data = $1', [data]);
    const isBlocked = dataBloqueada.rows.length > 0;
    
    const response = {
      agendamentos: result.rows,
      dataBloqueada: isBlocked,
      motivoBloqueio: isBlocked ? dataBloqueada.rows[0].motivo : null
    };
    
    res.json(response);
  } catch (err) {
    console.error('Erro ao buscar agendamentos da data:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
  }
});

// GET para listar agendamentos (PROTEGIDA - APENAS ADMIN)
app.get('/api/agendamentos', verificarAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        a.id,
        a.cliente_id,
        a.servico_id,
        TO_CHAR(a.data_agendada, 'YYYY-MM-DD') as data_agendada,
        a.hora_agendada,
        a.observacoes,
        a.status,
        a.alterado_em,
        c.nome as cliente_nome,
        c.email as cliente_email,
        c.telefone as cliente_telefone,
        s.nome as servico_nome,
        s.preco as servico_preco,
        s.descricao as servico_descricao
      FROM agendamentos a
      JOIN clientes c ON a.cliente_id = c.id
      JOIN servicos s ON a.servico_id = s.id
      ORDER BY a.data_agendada DESC, a.hora_agendada ASC
    `);
    
    // Processar as datas para garantir que estejam no formato correto
    const agendamentos = result.rows.map(agendamento => ({
      ...agendamento,
      // Garantir que a data seja retornada exatamente como está no banco
      data_agendada: agendamento.data_agendada
    }));
    
    // Debug: Verificar se os preços estão sendo retornados corretamente
    console.log(`Retornando ${agendamentos.length} agendamentos`);
    if (agendamentos.length > 0) {
      console.log('Exemplo de agendamento com preço:', {
        id: agendamentos[0].id,
        data_agendada: agendamentos[0].data_agendada,
        servico_nome: agendamentos[0].servico_nome,
        servico_preco: agendamentos[0].servico_preco
      });
    }
    
    res.json(agendamentos);
  } catch (err) {
    console.error('Erro ao buscar agendamentos:', err);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

// POST para bloquear data
app.post('/api/datas-bloqueadas', async (req, res) => {
  const { data, motivo } = req.body;

  if (!data) {
    return res.status(400).json({ error: 'Data é obrigatória' });
  }

  try {
    await db.query(
      'INSERT INTO datas_bloqueadas (data, motivo) VALUES ($1, $2) ON CONFLICT (data) DO NOTHING',
      [data, motivo || null]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Erro ao bloquear data:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// DELETE para desbloquear data
app.delete('/api/datas-bloqueadas/:data', async (req, res) => {
  const { data } = req.params;

  try {
    await db.query('DELETE FROM datas_bloqueadas WHERE data = $1', [data]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao desbloquear data:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// GET para listar datas bloqueadas
app.get('/api/datas-bloqueadas', async (req, res) => {
  try {
    const result = await db.query('SELECT TO_CHAR(data, \'YYYY-MM-DD\') as data, motivo FROM datas_bloqueadas ORDER BY data');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar datas bloqueadas:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// GET para listar logs de agendamentos
app.get('/api/logs-agendamentos', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT l.*, a.data_agendada, a.hora_agendada, c.nome as cliente_nome
      FROM logs_agendamentos l
      JOIN agendamentos a ON l.agendamento_id = a.id
      JOIN clientes c ON a.cliente_id = c.id
      ORDER BY l.criado_em DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar logs de agendamentos:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Middleware global de tratamento de erros
app.use((err, req, res, next) => {
  console.error('❌ Erro não tratado:', err);
  console.error('📋 Stack:', err.stack);
  
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// PATCH para atualizar status do agendamento (PROTEGIDA - APENAS ADMIN)
app.patch('/api/agendamentos/:id', verificarAuth, async (req, res) => {
  const { id } = req.params;
  const { status, alterado_por = 'sistema' } = req.body;

  console.log(`🔄 PATCH /api/agendamentos/${id} - Status: ${status}, Alterado por: ${alterado_por}`);

  if (!status) {
    console.log('❌ Status não fornecido');
    return res.status(400).json({ error: 'Status é obrigatório' });
  }

  // Verificar se o status é válido
  const statusValidos = ['pendente', 'confirmado', 'cancelado', 'concluido', 'não compareceu'];
  if (!statusValidos.includes(status)) {
    console.log(`❌ Status inválido: ${status}. Válidos: ${statusValidos.join(', ')}`);
    return res.status(400).json({ 
      error: 'Status inválido', 
      statusValidos: statusValidos 
    });
  }

  try {
    // Obter o status atual e informações do agendamento
    console.log(`🔍 Buscando agendamento ID: ${id}`);
    const agendamentoAtual = await db.query(`
      SELECT a.*, c.nome as cliente_nome, c.email as cliente_email, c.telefone as cliente_telefone
      FROM agendamentos a
      JOIN clientes c ON a.cliente_id = c.id
      WHERE a.id = $1
    `, [id]);

    if (agendamentoAtual.rows.length === 0) {
      console.log(`❌ Agendamento não encontrado: ID ${id}`);
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    const statusAnterior = agendamentoAtual.rows[0].status;
    console.log(`📋 Agendamento encontrado. Status atual: ${statusAnterior} → Novo status: ${status}`);

    // Atualizar o status do agendamento
    console.log(`💾 Atualizando status do agendamento ${id}`);
    await db.query(
      'UPDATE agendamentos SET status = $1, alterado_em = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );
    console.log(`✅ Status atualizado com sucesso`);

    // Registrar o log da alteração
    console.log(`📝 Registrando log da alteração`);
    console.log(`Log dados:`, {
      agendamento_id: parseInt(id),
      status_anterior: statusAnterior,
      status_novo: status,
      alterado_por: alterado_por,
      data_agendada: agendamentoAtual.rows[0].data_agendada,
      hora_agendada: agendamentoAtual.rows[0].hora_agendada,
      cliente_nome: agendamentoAtual.rows[0].cliente_nome
    });
    
    await db.query(
      `INSERT INTO logs_agendamentos 
      (agendamento_id, status_anterior, status_novo, alterado_por, data_agendada, hora_agendada, cliente_nome) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        parseInt(id), 
        statusAnterior, 
        status, 
        alterado_por,
        agendamentoAtual.rows[0].data_agendada,
        agendamentoAtual.rows[0].hora_agendada,
        agendamentoAtual.rows[0].cliente_nome || 'Cliente não identificado'
      ]
    );
    console.log(`✅ Log registrado com sucesso`);

    // Buscar o agendamento atualizado com todas as informações
    console.log(`🔍 Buscando agendamento atualizado`);
    const agendamentoAtualizado = await db.query(`
      SELECT 
        a.id,
        a.cliente_id,
        a.servico_id,
        TO_CHAR(a.data_agendada, 'YYYY-MM-DD') as data_agendada,
        a.hora_agendada,
        a.observacoes,
        a.status,
        a.alterado_em,
        c.nome as cliente_nome, 
        c.email as cliente_email, 
        c.telefone as cliente_telefone,
        s.nome as servico_nome, 
        s.preco as servico_preco
      FROM agendamentos a
      JOIN clientes c ON a.cliente_id = c.id
      JOIN servicos s ON a.servico_id = s.id
      WHERE a.id = $1
    `, [id]);

    console.log(`✅ Atualização completa do agendamento ${id}`);
    res.json(agendamentoAtualizado.rows[0]);
  } catch (err) {
    console.error(`❌ Erro ao atualizar status do agendamento ${id}:`, err);
    console.error('Detalhes do erro:', err.detail || err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: 'Erro interno no servidor', details: err.detail || err.message });
  }
});

// Iniciar servidor após testar conexão
testConnection().then(async connected => {
  if (connected) {
    // Limpar todas as sessões ativas ao reiniciar
    await limparSessoesAtivas();
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log('🔐 Sistema de login pronto - todas as sessões anteriores foram invalidadas');
    });
  } else {
    console.error('❌ Não foi possível iniciar o servidor devido a problemas na conexão com o banco de dados');
  }
});

// Handlers para encerramento gracioso do servidor
process.on('SIGINT', async () => {
  console.log('\n🔄 Recebido SIGINT, encerrando servidor...');
  console.log('🔒 Na próxima inicialização, todas as sessões ativas serão invalidadas');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Recebido SIGTERM, encerrando servidor...');
  console.log('🔒 Na próxima inicialização, todas as sessões ativas serão invalidadas');
  process.exit(0);
});