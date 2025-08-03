const path = require('path');
require('dotenv').config();

module.exports = {
  // Configurações do servidor
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },

  // Configurações do banco de dados
  database: {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    }
  },

  // Configurações de segurança
  security: {
    jwtSecret: process.env.JWT_SECRET,
    sessionSecret: process.env.SESSION_SECRET,
    encryptionKey: process.env.ENCRYPTION_KEY,
    saltRounds: 12,
    tokenExpiry: '24h',
    maxLoginAttempts: 5,
    lockoutTime: 15 * 60 * 1000 // 15 minutos
  },

  // Configurações de CORS
  cors: {
    origin: function (origin, callback) {
      // Permitir requisições sem origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'http://localhost:4200',
        'http://127.0.0.1:4200',
        'https://barbearia-do-alem-ltda.github.io',
        process.env.FRONTEND_URL
      ].filter(Boolean);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(null, true); // Permitir temporariamente para debug
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  },

  // Diretórios da aplicação
  paths: {
    root: path.resolve(__dirname, '..'),
    src: path.resolve(__dirname, '../src'),
    database: path.resolve(__dirname, '../database'),
    scripts: path.resolve(__dirname, '../scripts'),
    security: path.resolve(__dirname, '../security'),
    tests: path.resolve(__dirname, '../tests'),
    public: path.resolve(__dirname, '../public'),
    logs: path.resolve(__dirname, '../logs')
  },

  // Configurações de log
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: true,
      filename: 'app.log',
      maxSize: '10mb',
      maxFiles: 5
    },
    console: {
      enabled: process.env.NODE_ENV !== 'production'
    }
  },

  // Configurações da aplicação
  app: {
    name: 'Barbearia do Além API',
    version: '2.0.0',
    description: 'Sistema de agendamento para barbearia',
    contact: {
      name: 'Equipe Desenvolvimento',
      email: 'dev@barbeariadoalem.com'
    }
  }
};
