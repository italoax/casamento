/**
 * TOTP (Time-based One-Time Password) - Autenticação em 2 Fatores
 * 
 * Este arquivo implementa o padrão TOTP (RFC 6238) para autenticação de dois fatores.
 * Usado para gerar e verificar códigos de 6 dígitos que mudam a cada 30 segundos.
 * 
 * Fluxo:
 * 1. Usuário escaneie o QR code com seu autenticador (Google Authenticator, Authy, etc)
 * 2. O autenticador armazena o segredo base32
 * 3. A cada 30 segundos, um novo código de 6 dígitos é gerado
 * 4. No login, o usuário digita o código e we verify com verifyTotp()
 */

import { createHmac, timingSafeEqual } from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Decodifica uma string base32 para buffer
 * Base32 é o formato usado em QR codes de autenticadores
 * @param input String em base32 (ex: "JBSWY3DPEBLW64TMMQ======")
 * @returns Buffer com os bytes decodificados
 */
export function base32Decode(input: string) {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let buffer = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value < 0) continue;
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return Buffer.from(bytes);
}

export function totpCode(secret: string, timeSlice = Math.floor(Date.now() / 1000 / 30)) {
  // Decodifica o segredo do base32 para bytes
  const key = base32Decode(secret);
  
  // Cria um buffer de 8 bytes com o timestamp
  // TOTP divide o tempo em janelas de 30 segundos
  const time = Buffer.alloc(8);
  time.writeUInt32BE(0, 0);
  time.writeUInt32BE(timeSlice, 4);

  // Calcula HMAC-SHA1(chave, tempo)
  const hash = createHmac("sha1", key).update(time).digest();
  
  // Extrai 4 bytes do hash usando o offset dos últimos 4 bits
  const offset = hash[19] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  // Retorna os últimos 6 dígitos do número gerado
  return String(binary % 1000000).padStart(6, "0");
}

function safeEquals(a: string, b: string) {
  // Compara duas strings em tempo constante para prevenir timing attacks
  // Um atacante poderia descobrir a senha carácter por carácter medindo o tempo
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function verifyTotp(secret: string, code: string, window = 1) {
  // Remove espaços do código digitado
  const cleanCode = code.trim();
  
  // Valida se é um código de 6 dígitos
  if (!/^\d{6}$/.test(cleanCode)) return false;

  // Usa uma janela de tempo para tolerar:
  // - Pequenas diferenças de sincronização do relógio
  // - Código digitado nos últimos/próximos 30 segundos
  // window = 1 significa: código atual + 1 anterior + 1 próximo = 3 tentativas
  const currentSlice = Math.floor(Date.now() / 1000 / 30);
  for (let offset = -window; offset <= window; offset++) {
    if (safeEquals(totpCode(secret, currentSlice + offset), cleanCode)) return true;
  }
  return false;
}
