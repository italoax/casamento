/**
 * UPLOADS - Diretório persistente das imagens de presentes
 *
 * PROBLEMA que isto resolve:
 * A cada deploy na Hostinger, os arquivos do app são substituídos pelo conteúdo
 * do ZIP. Se as imagens enviadas pelo painel ficarem em public/img/presentes
 * (DENTRO da pasta do deploy), todo deploy apaga as imagens — porque o ZIP só
 * contém as imagens que existem no projeto local. Guardando-as FORA da pasta do
 * deploy, elas sobrevivem aos deploys.
 *
 * Configuração:
 * - PRODUÇÃO (Hostinger): defina UPLOADS_DIR para um caminho PERSISTENTE fora do
 *   diretório do app, por exemplo:  /home/SEU_USUARIO/uploads/presentes
 *   (crie a pasta uma vez; ela não é tocada pelos deploys).
 * - DEV / LOCAL: sem UPLOADS_DIR, cai em public/img/presentes (servido
 *   estaticamente pelo Next, comportamento de sempre).
 *
 * As imagens são servidas pela rota /img/presentes/[file] quando não estão na
 * pasta public — então o caminho salvo no banco ("img/presentes/arquivo.webp")
 * continua funcionando sem migração.
 */

import path from "node:path";

export function uploadsDir(): string {
  const custom = process.env.UPLOADS_DIR?.trim();
  if (custom) return custom;
  return path.join(process.cwd(), "public", "img", "presentes");
}

/**
 * Diretório das fotos enviadas pelos convidados na festa (mural de fotos).
 * Em produção fica ao lado das imagens de presentes, no mesmo local persistente
 * (ex.: UPLOADS_DIR = /home/user/uploads/presentes -> /home/user/uploads/festa),
 * para sobreviver aos deploys. Em dev cai em public/img/festa.
 */
export function festaUploadsDir(): string {
  const custom = process.env.UPLOADS_DIR?.trim();
  if (custom) return path.join(path.dirname(custom), "festa");
  return path.join(process.cwd(), "public", "img", "festa");
}

/** Caminho absoluto de uma foto da festa salva no banco ("img/festa/foo.webp"). */
export function resolveFestaUploadPath(stored: string): string {
  return path.join(festaUploadsDir(), path.basename(String(stored || "")));
}

/**
 * Converte o caminho salvo no banco (ex.: "img/presentes/foo.webp") no caminho
 * absoluto do arquivo em disco. Usa apenas o nome do arquivo (basename) para
 * impedir path traversal (ex.: "../../etc/passwd").
 */
export function resolveUploadPath(stored: string): string {
  const file = path.basename(String(stored || ""));
  return path.join(uploadsDir(), file);
}
