/**
 * Validação de email - Versão segura (RFC 5322 simplificado)
 */
export function validarEmail(email: string): boolean {
  if (!email || email.length > 254) return false;

  // Regex RFC 5322 simplificado mas mais seguro
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!re.test(email)) return false;

  // Validações adicionais
  const [local, domain] = email.split("@");

  if (local.length > 64) return false; // Local part muito longo
  if (local.startsWith(".") || local.endsWith(".")) return false; // Começa/termina com ponto
  if (local.includes("..")) return false; // Pontos consecutivos
  if (domain.includes("..")) return false; // Pontos consecutivos no domínio
  if (domain.split(".").some(p => p.length === 0)) return false; // Partes vazias

  return true;
}

export function validarCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Calcula primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  digit1 = digit1 > 9 ? 0 : digit1;

  if (digit1 !== parseInt(cleaned[9])) return false;

  // Calcula segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  digit2 = digit2 > 9 ? 0 : digit2;

  return digit2 === parseInt(cleaned[10]);
}

export function validarTelefone(telefone: string): boolean {
  const cleaned = telefone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 11;
}

export function validarCEP(cep: string): boolean {
  const cleaned = cep.replace(/\D/g, "");
  return cleaned.length === 8;
}

export function validarNomeCompleto(nome: string): boolean {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2;
}

export function validarDataValidade(validade: string): boolean {
  const [month, year] = validade.split("/");
  const monthNum = parseInt(month);
  const yearNum = parseInt("20" + year);

  if (!month || !year || monthNum < 1 || monthNum > 12) return false;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  return yearNum > currentYear || (yearNum === currentYear && monthNum >= currentMonth);
}

export function validarNumeroCartao(numero: string): boolean {
  const cleaned = numero.replace(/\D/g, "");
  if (cleaned.length < 13 || cleaned.length > 19) return false;

  // Algoritmo de Luhn
  let sum = 0;
  let isEven = false;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

export function validarCVV(cvv: string): boolean {
  const cleaned = cvv.replace(/\D/g, "");
  return cleaned.length >= 3 && cleaned.length <= 4;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validarFormulario(dados: Record<string, any>, schema: Record<string, (value: any) => boolean | string>): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [field, validator] of Object.entries(schema)) {
    const result = validator(dados[field]);
    if (typeof result === "string") {
      errors.push({ field, message: result });
    } else if (result === false) {
      errors.push({ field, message: `${field} é inválido` });
    }
  }

  return errors;
}
