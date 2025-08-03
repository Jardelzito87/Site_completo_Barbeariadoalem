-- Tabela: clientes
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    telefone VARCHAR(20) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: servicos
CREATE TABLE IF NOT EXISTS servicos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    descricao TEXT,
    preco NUMERIC(7,2) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL,
    servico_id INT NOT NULL,
    data_agendada DATE NOT NULL,
    hora_agendada TIME NOT NULL,
    observacoes TEXT,
    status VARCHAR(30) CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'concluido', 'não compareceu')) DEFAULT 'pendente',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alterado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    CONSTRAINT fk_servico FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE,
    CONSTRAINT unico_agendamento UNIQUE (cliente_id, data_agendada, hora_agendada)
);

-- Tabela: logs_agendamentos
CREATE TABLE IF NOT EXISTS logs_agendamentos (
    id SERIAL PRIMARY KEY,
    agendamento_id INT,
    status_anterior VARCHAR(30) CHECK (status_anterior IN ('pendente', 'confirmado', 'cancelado', 'concluido', 'não compareceu')),
    status_novo VARCHAR(30) CHECK (status_novo IN ('pendente', 'confirmado', 'cancelado', 'concluido', 'não compareceu')),
    alterado_por VARCHAR(100) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_agendada DATE,
    hora_agendada TIME,
    cliente_nome VARCHAR(100),
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE SET NULL
);

-- Tabela: datas_bloqueadas
CREATE TABLE IF NOT EXISTS datas_bloqueadas (
    id SERIAL PRIMARY KEY,
    data DATE UNIQUE NOT NULL,
    motivo VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserções iniciais de serviços
INSERT INTO servicos (nome, descricao, preco) VALUES
('Corte Sobrenatural', 'Transformação completa com técnicas ancestrais. Inclui ritual de purificação capilar', 45.00),
('Degradê Espectral', 'Fade perfeito com transições invisíveis. Realizado com tesouras forjadas em metal do além', 55.00),
('Navalha Demoníaca', 'Precisão sobrenatural com nossa navalha ritual. Inclui massagem craniana com óleos místicos', 65.00),
('Barba Maldita', 'Modelagem completa da barba com produtos infernais. Inclui toalha quente e óleo de barba especial', 40.00),
('Pacto Completo', 'Combo de corte e barba com direito a ritual completo. Inclui bebida e tratamento especial', 90.00),
('Transformação Sombria', 'Mudança radical de visual com direito a coloração e tratamento capilar das trevas', 120.00)
ON CONFLICT (nome) DO UPDATE SET 
  descricao = EXCLUDED.descricao, 
  preco = EXCLUDED.preco;