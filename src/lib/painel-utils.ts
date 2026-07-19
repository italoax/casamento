export function formatMoney(value: unknown) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(value: unknown) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

export function digits(value: unknown) {
  return String(value || "").replace(/\D+/g, "");
}

export function normalizePhone(value: unknown) {
  let d = digits(value);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length > 11) d = d.slice(-11);
  return d;
}

export function formatPhone(value: unknown) {
  const d = normalizePhone(value);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return String(value || "-");
}

export function whatsappUrl(value: unknown, nome: unknown) {
  const d = normalizePhone(value);
  if (![10, 11].includes(d.length)) return "";
  const msg = `Olá, ${String(nome || "") || "tudo bem"}! Tudo bem? Passando para lembrar de confirmar sua presença no casamento da Emanuelle e do Ítalo. 💛`;
  return `https://wa.me/55${d}?text=${encodeURIComponent(msg)}`;
}

export function formatCpf(value: unknown) {
  const d = digits(value);
  if (d.length !== 11) return String(value || "-");
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatCep(value: unknown) {
  const d = digits(value);
  if (d.length !== 8) return String(value || "-");
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function formatPaymentMethod(method: unknown) {
  const m = String(method || "").trim().toLowerCase();
  if (!m) return "-";
  if (m === "pix" || m === "bank_transfer") return "PIX";
  if (m === "cartao") return "Cartão";
  if (m === "credit_card") return "Cartão de crédito";
  if (m === "debit_card") return "Cartão de débito";
  return m.toUpperCase();
}

export function statusConvidadoLabel(status: unknown) {
  const s = String(status || "pendente").toLowerCase();
  if (s === "confirmado") return "Confirmado";
  if (s === "recusado") return "Não irei";
  return "Pendente";
}

export function statusBadgeClass(status: unknown) {
  const s = String(status || "pendente").toLowerCase();
  if (["confirmado", "approved", "paid", "received", "confirmed", "received_in_cash", "1", "sucesso"].includes(s)) return "confirmado";
  if (["recusado", "rejected", "refused", "failed", "overdue", "cancelled", "canceled", "0", "erro", "expirado"].includes(s)) return "recusado";
  return "pendente";
}

export function labelStatus(status: unknown) {
  const s = String(status || "pendente").toLowerCase();
  if (s === "confirmado") return "Confirmado";
  if (s === "recusado") return "Não irei";
  if (["approved", "paid", "received", "confirmed", "received_in_cash"].includes(s)) return "Aprovado";
  if (["pending", "in_process"].includes(s)) return "Pendente";
  if (["rejected", "refused", "failed", "overdue", "cancelled", "canceled"].includes(s)) return "Recusado";
  if (s === "1") return "Aprovado";
  if (s === "0") return "Pendente";
  return s || "Pendente";
}

export function contarIdades(lista: unknown) {
  const texto = String(lista || "");
  const total = { adulto: 0, c0_5: 0, c6_10: 0 };
  const partes = texto.split(/\r?\n|,|;/).map((p) => p.trim()).filter(Boolean);
  for (const parte of partes) {
    const faixaCrianca = parte.match(/\((?:crian[cç]a)\s*([^)]*)\)\s*$/i)?.[1]?.toLowerCase() || "";
    if (faixaCrianca) {
      if (faixaCrianca.includes("0-5") || faixaCrianca.includes("0 a 5") || faixaCrianca.includes("0/5")) total.c0_5++;
      else total.c6_10++;
      continue;
    }
    const idade = parte.match(/(?:^|\D)(\d{1,2})\s*(?:anos?|a\b)/i)?.[1];
    if (!idade) {
      total.adulto++;
      continue;
    }
    const n = Number(idade);
    if (n <= 5) total.c0_5++;
    else if (n <= 10) total.c6_10++;
    else total.adulto++;
  }
  return total;
}

export function normalizarImagemPresente(imagem: unknown, thumb?: unknown) {
  const value = String(thumb || imagem || "").trim();
  if (!value) return "";
  if (/^(https?:)?\/\//i.test(value)) return value;
  if (value.startsWith("/")) return value;
  if (value.startsWith("img/presentes/")) return `/${value}`;
  return `/img/presentes/${value}`;
}

export function precoUnitarioPresente(p: Record<string, unknown>) {
  const preco = Number(p.preco || 0);
  const qtdRaw = p.quantidade_disponivel;
  const qtd = qtdRaw === null || qtdRaw === undefined || qtdRaw === "" ? null : Math.max(0, Number(qtdRaw));
  const modo = String(p.modo_exibicao || "");
  const usaCotas = modo === "cotas" || (modo === "" && qtd !== null && qtd > 1);
  if (!usaCotas || !qtd) return preco;
  const totalRef = Number(p.preco_total_referencia || 0);
  if (totalRef > 0) return Math.round((totalRef / qtd) * 100) / 100;
  return preco;
}
