-- Script para criar sistema de login administrativo

-- Criar tabela de administradores
CREATE TABLE IF NOT EXISTS administradores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    nivel_acesso VARCHAR(20) CHECK (nivel_acesso IN ('admin', 'super_admin')) DEFAULT 'admin',
    ativo BOOLEAN DEFAULT TRUE,
    ultimo_login TIMESTAMP,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alterado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de logs de login
CREATE TABLE IF NOT EXISTS logs_login (
    id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    sucesso BOOLEAN NOT NULL,
    tentativa_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES administradores(id) ON DELETE CASCADE
);

-- Criar tabela de sessões (para controle de login)
CREATE TABLE IF NOT EXISTS sessoes_admin (
    id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expira_em TIMESTAMP NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES administradores(id) ON DELETE CASCADE
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_sessoes_token ON sessoes_admin(token);
CREATE INDEX IF NOT EXISTS idx_sessoes_expira ON sessoes_admin(expira_em);

-- Inserir usuário administrativo padrão
-- Senha padrão: "admin123" (será hashada pelo sistema)
INSERT INTO administradores (nome, email, senha_hash, nivel_acesso) 
VALUES ('Admin do Além', 'admin@barbeariadoalem.com', 'TEMP_HASH', 'super_admin')
ON CONFLICT (email) DO NOTHING;

COMMIT;
