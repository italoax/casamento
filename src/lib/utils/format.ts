/**
 * Utilitários de formatação
 */

export function formatarMoeda(valor: number, locale = "pt-BR", currency = "BRL"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(valor);
}

export function arredondarMoeda(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function formatarCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatarTelefone(telefone: string): string {
  const cleaned = telefone.replace(/\D/g, "");
  
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  
  return telefone;
}

export function formatarCEP(cep: string): string {
  const cleaned = cep.replace(/\D/g, "");
  return cleaned.replace(/(\d{5})(\d{3})/, "$1-$2");
}

export function formatarCartao(numero: string): string {
  const cleaned = numero.replace(/\D/g, "");
  return cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function formatarData(data: Date | string, locale = "pt-BR"): string {
  const dateObj = typeof data === "string" ? new Date(data) : data;
  return dateObj.toLocaleDateString(locale);
}

export function formatarDataCompleta(data: Date | string, locale = "pt-BR"): string {
  const dateObj = typeof data === "string" ? new Date(data) : data;
  return dateObj.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatarHora(data: Date | string, locale = "pt-BR"): string {
  const dateObj = typeof data === "string" ? new Date(data) : data;
  return dateObj.toLocaleTimeString(locale);
}

export function formatarDataHora(data: Date | string, locale = "pt-BR"): string {
  const dateObj = typeof data === "string" ? new Date(data) : data;
  return dateObj.toLocaleString(locale);
}

export function slugificar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function capitalizarPrimeira(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

export function capitalizarPalavras(texto: string): string {
  return texto
    .split(" ")
    .map((palavra) => capitalizarPrimeira(palavra))
    .join(" ");
}

export function truncar(texto: string, maxLength: number, suffix = "..."): string {
  if (texto.length <= maxLength) return texto;
  return texto.substring(0, maxLength - suffix.length) + suffix;
}

export function limparHTML(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

export function escaparHTML(texto: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return texto.replace(/[&<>"']/g, (m) => map[m]);
}
