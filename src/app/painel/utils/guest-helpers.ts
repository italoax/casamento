export type Row = Record<string, any>;
export type GuestRow = { nome: string; idade: string; status: string };

export function contarIdades(lista: any) {
  const total = { adulto: 0, c0_5: 0, c6_10: 0 };
  String(lista || "")
    .split(/\r?\n|,|;/)
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((p) => {
      const faixaCrianca = p.match(/\((?:crian[cç]a)\s*([^)]*)\)\s*$/i)?.[1]?.toLowerCase() || "";
      if (faixaCrianca) {
        if (faixaCrianca.includes("0-5") || faixaCrianca.includes("0 a 5") || faixaCrianca.includes("0/5")) total.c0_5++;
        else total.c6_10++;
        return;
      }
      const m = p.match(/(?:^|\D)(\d{1,2})\s*(?:anos?|a\b)/i);
      if (!m) total.adulto++;
      else if (Number(m[1]) <= 5) total.c0_5++;
      else if (Number(m[1]) <= 10) total.c6_10++;
      else total.adulto++;
    });
  return total;
}

export function extrairIdade(nomeCompleto: any) {
  const nomeLimpo = String(nomeCompleto || "").trim();
  const match = nomeLimpo.match(/\s*\((Crian[cç]a)([^)]*)\)\s*$/i);
  if (!match) return { nomeBase: nomeLimpo, idade: "adulto" };
  const faixa = String(match[2] || "").toLowerCase();
  const idade = faixa.includes("0-5") || faixa.includes("0 a 5") || faixa.includes("0/5") ? "crianca_0_5" : "crianca_6_10";
  return { nomeBase: nomeLimpo.replace(/\s*\((Crian[cç]a)[^)]*\)\s*$/i, "").trim(), idade };
}

export function montarNomeComIdade(nome: string, idade: string) {
  const nomeLimpo = String(nome || "").trim();
  if (!nomeLimpo) return "";
  if (idade === "adulto") return nomeLimpo;
  return `${nomeLimpo} (${idade === "crianca_0_5" ? "Criança 0-5" : "Criança 6-10"})`;
}

export function convidadosIniciais(row?: Row): GuestRow[] {
  const lista = String(row?.nomes_lista || "").split(/\s*,\s*|\r?\n|;/).map((x) => x.trim()).filter(Boolean);
  const confirmados = new Set(String(row?.nomes_confirmados || "").split(/\s*,\s*|\r?\n|;/).map((x) => x.trim()).filter(Boolean));
  if (!lista.length) return [{ nome: "", idade: "adulto", status: "pendente" }];
  return lista.map((item) => {
    const parsed = extrairIdade(item);
    const nomeCompleto = montarNomeComIdade(parsed.nomeBase, parsed.idade);
    const status = confirmados.has(item) || confirmados.has(nomeCompleto) ? "confirmado" : (row?.status === "recusado" ? "recusado" : "pendente");
    return { nome: parsed.nomeBase, idade: parsed.idade, status };
  });
}
