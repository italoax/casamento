-- =====================================================================
-- Estrutura do banco de dados — Casamento Emanuelle & Ítalo
-- Apenas as TABELAS (sem dados). Rode isto no banco novo (vazio).
--
-- Como usar:
--   - phpMyAdmin/painel do provedor: aba "Importar" -> selecione este arquivo.
--   - ou via terminal:  mysql -h HOST -P PORTA -u USUARIO -p NOME_DO_BANCO < schema.sql
--
-- Observação: o app cria a maioria destas tabelas sozinho (CREATE TABLE IF NOT
-- EXISTS) na primeira vez que precisa. As ÚNICAS que ele NÃO cria são
-- `convidados` e `presentes` — então essas duas são obrigatórias aqui.
-- Charset utf8mb4 em tudo (suporta acentos e emojis).
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- Usuários do PAINEL (login admin). NÃO é criada pelo app — obrigatória.
-- Crie um usuário admin com o script database/criar-admin.mjs (gera o hash).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(120) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,                 -- hash bcrypt (nunca senha em texto puro)
  role VARCHAR(20) NOT NULL DEFAULT 'admin',   -- admin | gerente
  permissoes JSON NULL,                        -- NULL = usa as permissões padrão do role
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  twofa_secret VARCHAR(64) NULL,               -- segredo do 2FA (TOTP), opcional
  twofa_enabled TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Lista de convidados (RSVP). NÃO é criada pelo app — obrigatória.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS convidados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(30) NULL,
  email VARCHAR(255) NULL,
  nomes_lista TEXT NULL,                 -- nomes pré-cadastrados do convite (1 por linha)
  convites_disponiveis INT DEFAULT 0,    -- limite de acompanhantes (-1 = sem limite, conforme uso)
  convites_confirmados INT DEFAULT 0,
  nomes_confirmados TEXT NULL,           -- nomes que o convidado confirmou
  status VARCHAR(20) DEFAULT 'pendente', -- pendente | confirmado | recusado
  visibilidade VARCHAR(20) DEFAULT 'disponivel', -- disponivel | oculto
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_nome (nome),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Lista de presentes. NÃO é criada pelo app — obrigatória.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS presentes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) NULL,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  preco_base DECIMAL(10,2) NULL,             -- preço sem a taxa (para recalcular)
  preco_total_referencia DECIMAL(10,2) NULL, -- valor total de referência (modo cotas)
  status VARCHAR(20) DEFAULT 'visivel',      -- visivel | oculto
  imagem VARCHAR(1000) NULL,
  imagem_thumb VARCHAR(1000) NULL,
  imagem_original_nome VARCHAR(255) NULL,
  imagem_mime VARCHAR(100) NULL,
  imagem_largura INT NULL,
  imagem_altura INT NULL,
  quantidade_disponivel INT NULL,            -- NULL = sem limite; 1 = presente único; N = cotas/limite
  quantidade_vendida INT DEFAULT 0,
  quantidade_reservada INT DEFAULT 0,
  modo_exibicao VARCHAR(20) DEFAULT 'padrao',-- padrao | cotas
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Vendas / contribuições (Pix e cartão).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome_comprador VARCHAR(255),
  mensagem TEXT,
  itens TEXT,
  ids_produtos TEXT,
  valor_total DECIMAL(10,2),
  email VARCHAR(255),
  cpf VARCHAR(20),
  telefone VARCHAR(20),
  cep VARCHAR(12) NULL,
  numero_endereco VARCHAR(20) NULL,
  data_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
  gateway_payment_id VARCHAR(80),
  status VARCHAR(50),
  status_detail VARCHAR(80) NULL,
  comprovante_enviado TINYINT(1) DEFAULT 0,
  status_token VARCHAR(64) NULL,
  pix_qr_code_id VARCHAR(80) NULL,
  qr_code TEXT NULL,
  qr_code_base64 MEDIUMTEXT NULL,
  date_of_expiration DATETIME NULL,
  payment_method VARCHAR(20) NULL,
  external_reference VARCHAR(80) NULL,
  INDEX idx_gateway_payment_id (gateway_payment_id),
  INDEX idx_status_token (status_token),
  INDEX idx_external_reference (external_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Logs do site (aba "Logs" do painel).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tipo VARCHAR(30),
  status VARCHAR(30),
  mensagem TEXT,
  nome_comprador VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  cpf VARCHAR(20) NULL,
  telefone VARCHAR(20) NULL,
  itens TEXT NULL,
  valor DECIMAL(10,2) NULL,
  gateway_payment_id VARCHAR(80) NULL,
  external_reference VARCHAR(80) NULL,
  payload JSON NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Recados / mural de mensagens.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  nome VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL,
  mensagem TEXT NOT NULL,
  aprovado TINYINT(1) NOT NULL DEFAULT 0,
  ip VARCHAR(64) NULL,
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Idempotência do webhook da Efí (evita processar o mesmo evento 2x).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhook_idempotency (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  gateway_payment_id VARCHAR(80),
  event_type VARCHAR(50),
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  response_status INT,
  response_body JSON,
  INDEX idx_key (idempotency_key),
  INDEX idx_payment_id (gateway_payment_id),
  INDEX idx_processed_at (processed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Taxa de precificação dos presentes (linha única, id = 1).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS presentes_precificacao (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  taxa_percentual DECIMAL(8,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Configurações do RSVP (ex.: prazo de confirmação).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rsvp_config (
  chave VARCHAR(120) NOT NULL PRIMARY KEY,
  valor TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Alertas de segurança.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  ip_address VARCHAR(45),
  description TEXT,
  affected_resource VARCHAR(255),
  details JSON,
  user_id VARCHAR(100),
  notified_at TIMESTAMP NULL,
  resolved_at TIMESTAMP NULL,
  status VARCHAR(20) DEFAULT 'OPEN',
  admin_notes TEXT,
  INDEX idx_created_at (created_at),
  INDEX idx_severity (severity),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_ip_address (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Logs de auditoria (LGPD/compliance).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  event_type VARCHAR(50) NOT NULL,
  user_id VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INT,
  details JSON,
  error_message TEXT,
  request_body_hash VARCHAR(64),
  INDEX idx_created_at (created_at),
  INDEX idx_event_type (event_type),
  INDEX idx_user_id (user_id),
  INDEX idx_ip_address (ip_address),
  INDEX idx_endpoint (endpoint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
