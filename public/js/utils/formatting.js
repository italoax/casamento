function normalizarDigitos(valor = "") {
  return valor.replace(/\D/g, "");
}

function formatarCPF(valor = "") {
  const digits = normalizarDigitos(valor).slice(0, 11);
  const parte1 = digits.slice(0, 3);
  const parte2 = digits.slice(3, 6);
  const parte3 = digits.slice(6, 9);
  const parte4 = digits.slice(9, 11);
  let resultado = parte1;
  if (parte2) resultado += `.${parte2}`;
  if (parte3) resultado += `.${parte3}`;
  if (parte4) resultado += `-${parte4}`;
  return resultado;
}

function formatarTelefone(valor = "") {
  const digits = normalizarDigitos(valor).slice(0, 11);
  const ddd = digits.slice(0, 2);
  if (!ddd) return digits;
  if (digits.length <= 10) {
    const p1 = digits.slice(2, 6);
    const p2 = digits.slice(6, 10);
    return `(${ddd}) ${p1}${p2 ? `-${p2}` : ""}`;
  }
  const parte1 = digits.slice(2, 7);
  const parte2 = digits.slice(7, 11);
  return `(${ddd}) ${parte1}${parte2 ? `-${parte2}` : ""}`;
}

function formatarCEP(valor = "") {
  const digits = normalizarDigitos(valor).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatarNumeroCartao(valor = "") {
  const digits = normalizarDigitos(valor).slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatarValidadeCartao(valor = "") {
  const digits = normalizarDigitos(valor).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function formatarMoedaBR(valor) {
  return `R$ ${Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function arredondarMoeda(valor) {
  return Math.round(valor * 100) / 100;
}

function limitarDescricaoPix(descricao = "") {
  const limpa = String(descricao || "").replace(/\s+/g, " ").trim();
  return (limpa || window.siteConfig.pix.pagamento.descricaoPadrao).slice(0, 37);
}

export { normalizarDigitos, formatarCPF, formatarTelefone, formatarCEP, formatarNumeroCartao, formatarValidadeCartao, formatarMoedaBR, arredondarMoeda, limitarDescricaoPix };
