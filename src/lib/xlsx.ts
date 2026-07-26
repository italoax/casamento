/**
 * Gerador de planilha .xlsx (Excel) sem dependência externa.
 *
 * Monta o pacote OOXML mínimo (um ZIP de XMLs) que o Excel/LibreOffice/Google
 * Sheets abrem como planilha nativa — cabeçalho em negrito, números como
 * números e larguras de coluna. Evita bibliotecas como SheetJS (histórico de
 * CVEs). O ZIP usa o método "stored" (sem compressão), que é válido e o Excel
 * aceita; a mesma técnica de zip do scripts/deploy.mjs.
 */

type Celula = string | number | null | undefined;

/** Escapa texto para dentro de XML. */
function xmlEscape(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    // pula controles inválidos em XML 1.0 (mantém tab 0x09, nl 0x0a, cr 0x0d)
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) continue;
    const ch = value[i];
    if (ch === "&") out += "&amp;";
    else if (ch === "<") out += "&lt;";
    else if (ch === ">") out += "&gt;";
    else if (ch === '"') out += "&quot;";
    else if (ch === "'") out += "&apos;";
    else out += ch;
  }
  return out;
}

/** Índice de coluna (0-based) para letra do Excel: 0->A, 26->AA. */
function colLetter(index: number): string {
  let n = index;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/** Nome de aba válido: <=31 chars e sem caracteres proibidos. */
function nomeAbaValido(nome: string): string {
  return (nome || "Planilha").replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Planilha";
}

function celulaXml(ref: string, valor: Celula, ehCabecalho: boolean): string {
  const estilo = ehCabecalho ? ' s="1"' : "";
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return `<c r="${ref}"${estilo}><v>${valor}</v></c>`;
  }
  const texto = valor === null || valor === undefined ? "" : String(valor);
  if (texto === "") return `<c r="${ref}"${estilo}/>`;
  return `<c r="${ref}"${estilo} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(texto)}</t></is></c>`;
}

function sheetXml(headers: string[], rows: Celula[][]): string {
  const larguras = headers
    .map((h, i) => {
      const maxCorpo = rows.reduce((m, r) => Math.max(m, String(r[i] ?? "").length), 0);
      const largura = Math.min(60, Math.max(10, Math.max(h.length, maxCorpo) + 2));
      return `<col min="${i + 1}" max="${i + 1}" width="${largura}" customWidth="1"/>`;
    })
    .join("");

  const linhas: string[] = [];
  linhas.push(
    `<row r="1">${headers.map((h, i) => celulaXml(`${colLetter(i)}1`, h, true)).join("")}</row>`,
  );
  rows.forEach((r, ri) => {
    const n = ri + 2;
    const cells = headers.map((_, ci) => celulaXml(`${colLetter(ci)}${n}`, r[ci], false)).join("");
    linhas.push(`<row r="${n}">${cells}</row>`);
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${larguras}</cols><sheetData>${linhas.join("")}</sheetData></worksheet>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

function workbookXml(nomeAba: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(nomeAba)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}

/* ---- ZIP "stored" (sem compressão), igual em espírito ao deploy.mjs ---- */

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(arquivos: Array<{ nome: string; dados: Buffer }>): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const { nome, dados } of arquivos) {
    const nameBuf = Buffer.from(nome, "utf8");
    const crc = crc32(dados);
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(dados.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);
    chunks.push(local, dados);

    const c = Buffer.alloc(46 + nameBuf.length);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(0, 10);
    c.writeUInt16LE(0, 12);
    c.writeUInt16LE(0x21, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(dados.length, 20);
    c.writeUInt32LE(dados.length, 24);
    c.writeUInt16LE(nameBuf.length, 28);
    c.writeUInt16LE(0, 30);
    c.writeUInt16LE(0, 32);
    c.writeUInt16LE(0, 34);
    c.writeUInt16LE(0, 36);
    c.writeUInt32LE(0, 38);
    c.writeUInt32LE(offset, 42);
    nameBuf.copy(c, 46);
    central.push(c);
    offset += local.length + dados.length;
  }
  const centralSize = central.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(arquivos.length, 8);
  end.writeUInt16LE(arquivos.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, ...central, end]);
}

/**
 * Gera uma planilha .xlsx (uma aba) a partir de cabeçalhos e linhas.
 * Números viram células numéricas; o resto vira texto.
 */
export function gerarXlsx(nomeAba: string, headers: string[], rows: Celula[][]): Buffer {
  const aba = nomeAbaValido(nomeAba);
  const arquivos = [
    { nome: "[Content_Types].xml", dados: Buffer.from(CONTENT_TYPES, "utf8") },
    { nome: "_rels/.rels", dados: Buffer.from(RELS, "utf8") },
    { nome: "xl/workbook.xml", dados: Buffer.from(workbookXml(aba), "utf8") },
    { nome: "xl/_rels/workbook.xml.rels", dados: Buffer.from(WORKBOOK_RELS, "utf8") },
    { nome: "xl/styles.xml", dados: Buffer.from(STYLES_XML, "utf8") },
    { nome: "xl/worksheets/sheet1.xml", dados: Buffer.from(sheetXml(headers, rows), "utf8") },
  ];
  return zipStore(arquivos);
}
