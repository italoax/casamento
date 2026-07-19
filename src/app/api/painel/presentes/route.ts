import { mkdir, unlink, writeFile } from "node:fs/promises";
import * as path from "node:path";
import sharp from "sharp";
import { errorJson, json, cleanText } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { columnExists, db, queryOne, tableExists } from "@/lib/db";
import { uploadsDir, resolveUploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

async function requireAuth() {
  return Boolean(await requirePainelPermission("manage_presentes"));
}

function money(v: unknown) {
  let raw = String(v ?? "").replace(/[R$%\s]/g, "");
  // Com vírgula = formato BR ("1.234,56"): pontos são milhar, vírgula é decimal.
  // Sem vírgula, o ponto JÁ é o separador decimal ("144.23" vindo do banco) — não remover,
  // senão "144.23" virava 14423 (preço ~100x maior) ao editar/salvar.
  raw = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function slugPresente(valor: unknown, fallback = "presente") {
  const slug = String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.(jpe?g|png|webp|gif)$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || fallback;
}

function safeFileName(fileName: string, nomePresente?: string) {
  const nomeBase = String(nomePresente || "").trim();
  const base = nomeBase && nomeBase.toLowerCase() !== "presente"
    ? slugPresente(nomeBase)
    : slugPresente(nomeBonitoDeArquivoPresente(fileName), "presente");
  return `${base}-${Date.now()}.webp`;
}

function nomeBonitoDeArquivoPresente(valor: unknown) {
  const raw = String(valor || "").trim();
  if (!raw) return "";
  const arquivo = path.basename(raw);
  const semExtensao = arquivo.replace(/\.(jpe?g|png|webp|gif)$/i, "");
  const limpo = semExtensao
    .replace(/-?\d{10,}$/g, "")
    .replace(/_[a-z]{2}(?:_[a-z0-9]+)+/gi, " ")
    .replace(/\b(?:ac|sl|ul|sx|sy|sr|uf|fmwebp|ql\d+|ss\d+|v1|v2)\b/gi, " ")
    .replace(/\b\d{3,5}\b/g, " ")
    .replace(/^[a-z0-9]{6,}\b[\s_-]*/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!limpo || limpo.length < 3) return "Presente";
  return limpo.toLowerCase().replace(/\b([a-záàâãéèêíïóôõöúçñ])/gi, letra => letra.toUpperCase());
}

function normalizarNomePresente(nome: unknown, upload: File | null) {
  const value = cleanText(nome, 120);
  const pareceArquivo = /\.(jpe?g|png|webp|gif)$/i.test(value) || /[_-]\d{10,}(?:\.(?:jpe?g|png|webp|gif))?$/i.test(value) || /_(?:AC|SL|UL|SX|SY|SR)_/i.test(value);
  if (value && !pareceArquivo) return value;
  return cleanText(nomeBonitoDeArquivoPresente(value || upload?.name), 120);
}

function arredondarMoeda(valor: number) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

async function getTaxaAtualPresentes() {
  if (!(await tableExists("presentes_precificacao"))) return 0;
  const row = await queryOne<{ taxa_percentual?: string | number }>("SELECT taxa_percentual FROM presentes_precificacao WHERE id = 1 LIMIT 1");
  const taxa = Number(row?.taxa_percentual || 0);
  return Number.isFinite(taxa) ? Math.max(0, taxa) : 0;
}

async function saveUpload(file: File | null, nomePresente?: string) {
  if (!file || file.size <= 0) return "";
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) return "";
  // Grava no diretório PERSISTENTE (fora da pasta do deploy quando UPLOADS_DIR
  // está configurado), para as imagens não sumirem a cada deploy na Hostinger.
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  const filename = safeFileName(file.name, nomePresente);
  const bytes = Buffer.from(await file.arrayBuffer());
  const webp = await sharp(bytes, { animated: false })
    .rotate()
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
  await writeFile(path.join(dir, filename), webp);
  return `img/presentes/${filename}`;
}

async function readPayload(request: Request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("multipart/form-data")) {
    const fd = await request.formData();
    const obj: Record<string, unknown> = {};
    fd.forEach((v, k) => { obj[k] = v; });
    const upload = fd.get("imagem_arquivo");
    return { body: obj, upload: upload instanceof File ? upload : null };
  }
  return { body: await request.json().catch(() => ({})), upload: null };
}

async function removeOldImage(id: number) {
  const row = await queryOne<{ imagem?: string; imagem_thumb?: string }>("SELECT imagem, imagem_thumb FROM presentes WHERE id = ? LIMIT 1", [id]);
  for (const img of [row?.imagem, row?.imagem_thumb]) {
    const value = String(img || "");
    if (!value || value.startsWith("http") || value.includes("..")) continue;
    if (!value.startsWith("img/presentes/")) continue;
    await unlink(resolveUploadPath(value)).catch(() => {});
  }
}

export async function POST(request: Request) {
  if (!(await requireAuth())) return errorJson("Não autenticado.", 401);
  const { body, upload } = await readPayload(request);
  const id = Number(body.id || body.id_presente || 0);
  const nome = normalizarNomePresente(body.nome || body.nome_presente, upload);
  const categoria = cleanText(body.categoria || "Outros", 100);
  const precoEntrada = money(body.preco);
  const status = String(body.status || body.visibilidade || "disponivel") === "oculto" ? "oculto" : "disponivel";
  const qtdInput = body.quantidade_cotas || body.quantidade_disponivel;
  const qtdRaw = qtdInput === "" || qtdInput == null ? null : Math.max(0, Number(qtdInput));
  const modo = String(body.modo_exibicao || "padrao") === "cotas" ? "cotas" : "padrao";
  const uploaded = await saveUpload(upload, nome);
  const imagem = uploaded || cleanText(body.imagem || body.imagem_atual, 255);
  if (!nome || precoEntrada < 5) return errorJson("Informe nome e preço maior ou igual a R$ 5,00.", 422);

  const hasQtd = await columnExists("presentes", "quantidade_disponivel");
  const hasModo = await columnExists("presentes", "modo_exibicao");
  const hasBase = await columnExists("presentes", "preco_base");
  const hasRef = await columnExists("presentes", "preco_total_referencia");
  const hasThumb = await columnExists("presentes", "imagem_thumb");
  const taxaAtual = await getTaxaAtualPresentes();
  const fatorTaxa = 1 + taxaAtual / 100;
  const precoBaseUnitario = modo === "cotas" && qtdRaw && qtdRaw > 0 ? arredondarMoeda(precoEntrada / qtdRaw) : precoEntrada;
  const precoUnit = arredondarMoeda(precoBaseUnitario * fatorTaxa);
  const precoTotalRef = modo === "cotas" && qtdRaw && qtdRaw > 0 ? arredondarMoeda(precoEntrada * fatorTaxa) : null;

  if (id > 0) {
    if (uploaded) await removeOldImage(id);
    const sets = ["nome=?", "categoria=?", "preco=?", "status=?", "imagem=?"];
    const params: unknown[] = [nome, categoria, precoUnit, status, imagem];
    if (hasBase) { sets.push("preco_base=?"); params.push(precoBaseUnitario); }
    if (hasRef) { sets.push("preco_total_referencia=?"); params.push(precoTotalRef); }
    if (hasQtd) { sets.push("quantidade_disponivel=?"); params.push(qtdRaw); }
    if (hasModo) { sets.push("modo_exibicao=?"); params.push(modo); }
    if (hasThumb) { sets.push("imagem_thumb=?"); params.push(imagem); }
    params.push(id);
    await db().execute(`UPDATE presentes SET ${sets.join(", ")} WHERE id=?`, params as any[]);
    return json({ sucesso: true, mensagem: "Presente salvo com sucesso." });
  }

  const cols = ["nome", "categoria", "preco", "status", "imagem"];
  const vals: unknown[] = [nome, categoria, precoUnit, status, imagem];
  if (hasBase) { cols.push("preco_base"); vals.push(precoBaseUnitario); }
  if (hasRef) { cols.push("preco_total_referencia"); vals.push(precoTotalRef); }
  if (hasQtd) { cols.push("quantidade_disponivel", "quantidade_vendida", "quantidade_reservada"); vals.push(qtdRaw, 0, 0); }
  if (hasModo) { cols.push("modo_exibicao"); vals.push(modo); }
  if (hasThumb) { cols.push("imagem_thumb"); vals.push(imagem); }
  await db().execute(`INSERT INTO presentes (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`, vals as any[]);
  return json({ sucesso: true, mensagem: "Presente salvo com sucesso." });
}

export async function DELETE(request: Request) {
  if (!(await requireAuth())) return errorJson("Não autenticado.", 401);
  const id = Number(new URL(request.url).searchParams.get("id") || 0);
  if (!id) return errorJson("ID inválido.", 422);
  await removeOldImage(id);
  await db().execute("DELETE FROM presentes WHERE id = ?", [id]);
  return json({ sucesso: true, mensagem: "Presente removido com sucesso." });
}

export async function GET(request: Request) {
  if (!(await requireAuth())) return errorJson("Não autenticado.", 401);
  const id = Number(new URL(request.url).searchParams.get("id") || 0);
  if (!id) return errorJson("ID inválido.", 422);
  const row = await queryOne("SELECT * FROM presentes WHERE id = ? LIMIT 1", [id]);
  return json({ sucesso: true, presente: row });
}
