const TIMEZONE_SITE = "America/Sao_Paulo";

function normalizarDataIsoParaSP(dataIso) {
  if (!dataIso) return null;
  const texto = String(dataIso).trim();
  if (!texto) return null;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(texto)) {
    return new Date(texto);
  }
  let base = texto.replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(base)) {
    base = `${base}T00:00:00`;
  }
  return new Date(`${base}-03:00`);
}

function formatarDataSP(data) {
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE_SITE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(data);
}

function formatarHoraSP(data) {
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE_SITE,
    hour: "2-digit",
    minute: "2-digit"
  }).format(data);
}

function formatarDataHero(dataIso) {
  const data = normalizarDataIsoParaSP(dataIso);
  if (!data || Number.isNaN(data.getTime())) return "";
  const dataFmt = formatarDataSP(data);
  return dataFmt ? dataFmt.split("/").join(" . ") : "";
}

export { TIMEZONE_SITE, normalizarDataIsoParaSP, formatarDataSP, formatarHoraSP, formatarDataHero };
