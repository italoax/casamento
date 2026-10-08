import { createHash } from "node:crypto";
import { readdirSync, readFileSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";

function listar(dir, prefix = "") {
    return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0).flatMap(entry => {
        const relative = `${prefix}${entry.name}`;
        return entry.isDirectory() ? listar(path.join(dir, entry.name), `${relative}/`) : [relative];
    });
}
const hash = value => createHash("sha256").update(value).digest("hex").slice(0, 20);

export function prepararAssets(root = process.cwd()) {
    const publicDir = path.join(root, "public");
    const paths = {};
    const grupos = {};
    for (const grupo of ["css", "js"]) {
        const dir = path.join(publicDir, grupo);
        const arquivos = listar(dir).map(nome => {
            let conteudo = readFileSync(path.join(dir, nome));
            if (nome.endsWith(".css")) {
                // URLs de imagens/fontes continuam apontando para a pasta original.
                conteudo = Buffer.from(conteudo.toString().replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g, (original, a, b, c) => {
                    const value = (a ?? b ?? c).trim();
                    if (!value || /^(?:[a-z]+:|\/|#)/i.test(value)) return original;
                    const absolute = new URL(value, `https://site.invalid/${grupo}/${nome}`);
                    return `url("${absolute.pathname}${absolute.search}${absolute.hash}")`;
                }));
            }
            return { nome, conteudo };
        });
        // Inclui os nomes e os bytes: renomear uma dependência também muda a versão.
        const digest = createHash("sha256");
        for (const arquivo of arquivos) digest.update(arquivo.nome).update("\0").update(arquivo.conteudo).update("\0");
        const versao = digest.digest("hex").slice(0, 20);
        grupos[grupo] = versao;
        for (const { nome, conteudo } of arquivos) {
            const url = `/_assets/${grupo}/${versao}/${nome}`;
            const destino = path.join(publicDir, url);
            mkdirSync(path.dirname(destino), { recursive: true });
            // Nunca altera o conteúdo de uma URL imutável já publicada.
            if (existsSync(destino)) {
                if (!readFileSync(destino).equals(conteudo)) throw new Error(`Asset imutável divergente: ${url}`);
            } else writeFileSync(destino, conteudo);
            paths[`/${grupo}/${nome}`] = url;
        }
    }
    const version = hash(JSON.stringify(grupos) + readFileSync(path.join(publicDir, "sw.js")));
    return { paths, version };
}
