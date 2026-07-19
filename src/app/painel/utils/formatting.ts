export function money(value: any) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function utcStoredDate(value: any) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(raw)
    ? `${raw.replace(" ", "T")}Z`
    : raw;
}

export function dateBR(value: any) {
  if (!value) return "-";
  const d = new Date(utcStoredDate(value));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function datetimeLocalBR(value: any) {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function normalizedPhone(value: any) {
  let d = String(value || "").replace(/\D+/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length > 11) d = d.slice(-11);
  return d;
}

export function phone(value: any) {
  const d = normalizedPhone(value);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return value || "-";
}

export function whatsappUrl(value: any, nome: any) {
  const d = normalizedPhone(value);
  if (![10, 11].includes(d.length)) return "";
  const msg = `Olá, ${String(nome || "") || "tudo bem"}! Tudo bem? Passando para lembrar de confirmar sua presença no casamento da Emanuelle e do Ítalo. 💛`;
  return `https://wa.me/55${d}?text=${encodeURIComponent(msg)}`;
}

export function cpf(value: any) {
  const d = String(value || "").replace(/\D+/g, "");
  if (d.length !== 11) return value || "-";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function badge(status: any) {
  const s = String(status || "pendente").toLowerCase();
  if (["confirmado", "approved", "paid", "received", "confirmed", "received_in_cash", "1"].includes(s)) return "confirmado";
  if (["recusado", "rejected", "failed", "cancelled", "canceled", "0"].includes(s)) return "recusado";
  return "pendente";
}

export function labelStatus(status: any) {
  const s = String(status || "pendente").toLowerCase();
  if (s === "confirmado") return "Confirmado";
  if (s === "recusado") return "Não irei";
  if (["approved", "paid", "received", "confirmed", "received_in_cash"].includes(s)) return "Aprovado";
  if (["pending", "in_process", "pendente"].includes(s)) return "Pendente";
  if (s === "1") return "Aprovado";
  if (s === "0") return "Pendente";
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Pendente";
}

export function imagemPresente(value: any) {
  const img = String(value || "").trim();
  if (!img) return "";
  if (/^(https?:)?\/\//i.test(img)) return img;
  if (img.startsWith("/")) return img;
  if (img.startsWith("img/presentes/")) return `/${img}`;
  return `/img/presentes/${img}`;
}
