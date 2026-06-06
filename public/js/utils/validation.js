import { normalizarDigitos } from "./formatting.js";

function validarEmail(valor = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

function validarValidadeCartao(valor = "") {
  const digits = normalizarDigitos(valor);
  if (digits.length !== 4) return false;
  const mes = parseInt(digits.slice(0, 2), 10);
  const ano = parseInt(digits.slice(2), 10);
  if (!mes || mes < 1 || mes > 12) return false;
  const agora = new Date;
  const anoAtual = agora.getFullYear() % 100;
  const mesAtual = agora.getMonth() + 1;
  if (ano < anoAtual) return false;
  if (ano === anoAtual && mes < mesAtual) return false;
  return true;
}

function validarNumeroCartaoLuhn(numero = "") {
  let soma = 0;
  let alternar = false;
  for (let i = numero.length - 1; i >= 0; i -= 1) {
    let n = parseInt(numero[i], 10);
    if (alternar) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
    alternar = !alternar;
  }
  return soma % 10 === 0;
}

function validarCPF(valor = "") {
  const cpf = normalizarDigitos(valor);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let digito1 = soma * 10 % 11;
  if (digito1 === 10) digito1 = 0;
  if (digito1 !== parseInt(cpf.charAt(9), 10)) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  let digito2 = soma * 10 % 11;
  if (digito2 === 10) digito2 = 0;
  return digito2 === parseInt(cpf.charAt(10), 10);
}

function validarTelefone(valor = "") {
  const digits = normalizarDigitos(valor);
  if (!(digits.length === 10 || digits.length === 11)) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (digits.length === 11 && digits.charAt(2) !== "9") return false;
  return true;
}

function validarNomeCompleto(nome = "") {
  const nomeTrimed = String(nome || "").trim();
  const partes = nomeTrimed.split(/\s+/);
  return partes.length >= 2 && partes.every(parte => parte.length > 0);
}

export { validarEmail, validarValidadeCartao, validarNumeroCartaoLuhn, validarCPF, validarTelefone, validarNomeCompleto };
