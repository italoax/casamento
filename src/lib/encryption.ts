/**
 * Encriptação AES-256-GCM para dados sensíveis (CPF, Email, etc)
 * Conformidade LGPD: Protege dados pessoais em repouso
 */

import * as crypto from 'crypto';
import { env } from './env';

const ALGORITHM = 'aes-256-gcm';
const AUTH_TAG_LENGTH = 16;
const IV_LENGTH = 16;
const ENCODING = 'utf-8';

/**
 * Obtém a chave de encriptação a partir das variáveis de ambiente
 * ENCRYPTION_KEY deve ser uma string de 64 caracteres hex (256 bits)
 */
function getEncryptionKey(): Buffer {
  const keyHex = env('ENCRYPTION_KEY', '');
  
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY deve ter exatamente 64 caracteres hex (256 bits). ' +
      'Gere com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  try {
    return Buffer.from(keyHex, 'hex');
  } catch (err) {
    throw new Error('ENCRYPTION_KEY deve ser uma string válida em formato hexadecimal');
  }
}

/**
 * Encripta uma string usando AES-256-GCM
 * Retorna: iv + authTag + ciphertext em formato hex
 */
export function encryptData(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, ENCODING),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Combina: IV + authTag + ciphertext (todos em hex)
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('hex');
  } catch (error) {
    throw new Error(`Erro ao encriptar dados: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Descriptpta uma string encriptada com encryptData
 * Espera formato: iv + authTag + ciphertext em hex
 */
export function decryptData(encrypted: string): string {
  try {
    const key = getEncryptionKey();
    const buffer = Buffer.from(encrypted, 'hex');

    if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Formato de dados encriptado inválido (muito curto)');
    }

    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString(ENCODING);
  } catch (error) {
    // Em produção, não expor detalhes do erro
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Erro ao descriptografar dados');
    }
    throw new Error(`Erro ao descriptografar: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Encripta CPF (remove máscara, encripta)
 */
export function encryptCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) {
    throw new Error('CPF inválido');
  }
  return encryptData(cleaned);
}

/**
 * Descriptpta CPF (retorna apenas números)
 */
export function decryptCPF(encrypted: string): string {
  return decryptData(encrypted);
}

/**
 * Encripta email (converte para minúsculas antes)
 */
export function encryptEmail(email: string): string {
  const cleaned = email.toLowerCase().trim();
  if (!cleaned.includes('@')) {
    throw new Error('Email inválido');
  }
  return encryptData(cleaned);
}

/**
 * Descriptpta email
 */
export function decryptEmail(encrypted: string): string {
  return decryptData(encrypted);
}

/**
 * Encripta telefone (remove não-dígitos)
 */
export function encryptPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return encryptData(cleaned);
}

/**
 * Descriptpta telefone
 */
export function decryptPhone(encrypted: string): string {
  return decryptData(encrypted);
}

/**
 * Gera ENCRYPTION_KEY para uso em produção
 * Use: node -e "require('./lib/encryption').generateEncryptionKey()"
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
