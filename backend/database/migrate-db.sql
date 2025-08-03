-- Backup de dados existentes
CREATE TEMP TABLE IF NOT EXISTS temp_clientes AS SELECT * FROM clientes;
CREATE TEMP TABLE IF NOT EXISTS temp_servicos AS SELECT * FROM servicos;
CREATE TEMP TABLE IF NOT EXISTS temp_agendamentos AS SELECT * FROM agendamentos;
CREATE TEMP TABLE IF NOT EXISTS temp_logs AS SELECT * FROM logs_agendamentos;
CREATE TEMP TABLE IF NOT EXISTS temp_datas_bloqueadas AS SELECT * FROM datas_bloqueadas;

-- Alteração na tabela logs_agendamentos
ALTER TABLE logs_agendamentos 
  ADD COLUMN IF NOT EXISTS data_agendada DATE,
  ADD COLUMN IF NOT EXISTS hora_agendada TIME,
  ADD COLUMN IF NOT EXISTS cliente_nome VARCHAR(100);

-- Atualizar logs existentes com informações dos agendamentos
UPDATE logs_agendamentos l
SET 
  data_agendada = a.data_agendada,
  hora_agendada = a.hora_agendada,
  cliente_nome = c.nome
FROM agendamentos a
JOIN clientes c ON a.cliente_id = c.id
WHERE l.agendamento_id = a.id;

-- Alterar a constraint de foreign key para SET NULL
ALTER TABLE logs_agendamentos 
  DROP CONSTRAINT IF EXISTS logs_agendamentos_agendamento_id_fkey,
  ALTER COLUMN agendamento_id DROP NOT NULL,
  ADD CONSTRAINT logs_agendamentos_agendamento_id_fkey 
    FOREIGN KEY (agendamento_id) 
    REFERENCES agendamentos(id) 
    ON DELETE SET NULL;

-- Restaurar dados se necessário
INSERT INTO clientes 
SELECT * FROM temp_clientes 
ON CONFLICT (id) DO NOTHING;

INSERT INTO servicos 
SELECT * FROM temp_servicos 
ON CONFLICT (id) DO NOTHING;

INSERT INTO agendamentos 
SELECT * FROM temp_agendamentos 
ON CONFLICT (id) DO NOTHING;

INSERT INTO logs_agendamentos 
SELECT * FROM temp_logs 
ON CONFLICT (id) DO NOTHING;

INSERT INTO datas_bloqueadas 
SELECT * FROM temp_datas_bloqueadas 
ON CONFLICT (id) DO NOTHING;

-- Limpar tabelas temporárias
DROP TABLE IF EXISTS temp_clientes;
DROP TABLE IF EXISTS temp_servicos;
DROP TABLE IF EXISTS temp_agendamentos;
DROP TABLE IF EXISTS temp_logs;
DROP TABLE IF EXISTS temp_datas_bloqueadas;
