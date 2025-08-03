const path = require('path');

// Definir caminhos relativos ao diretório raiz do backend
const BACKEND_ROOT = path.resolve(__dirname, '..');

// Função para resolver caminhos baseados na nova estrutura
function resolvePath(relativePath) {
  return path.resolve(BACKEND_ROOT, relativePath);
}

// Mapeamento dos novos caminhos
const paths = {
  // Diretórios principais
  root: BACKEND_ROOT,
  src: resolvePath('src'),
  config: resolvePath('config'),
  database: resolvePath('database'),
  scripts: resolvePath('scripts'),
  security: resolvePath('security'),
  tests: resolvePath('tests'),
  public: resolvePath('public'),
  
  // Arquivos específicos
  serverJs: resolvePath('src/server.js'),
  envFile: resolvePath('.env'),
  envExample: resolvePath('.env.example'),
  credentials: resolvePath('.credentials.json'),
  packageJson: resolvePath('package.json'),
  
  // Scripts de banco
  initDb: resolvePath('database/init-db.sql'),
  migrateDb: resolvePath('database/migrate-db.sql'),
  setupLoginSql: resolvePath('database/setup-login.sql'),
  
  // Scripts de segurança
  generateCredentials: resolvePath('security/generate-secure-credentials.js'),
  updatePassword: resolvePath('security/update-admin-password.js'),
  
  // Scripts de teste
  testConnection: resolvePath('tests/test-connection.js'),
  testApi: resolvePath('tests/teste-api-simples.js')
};

module.exports = {
  paths,
  resolvePath,
  BACKEND_ROOT
};
