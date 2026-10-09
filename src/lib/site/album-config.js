import { db, queryOne } from "../db";
import { validarSelecao } from "./album-adobe.mjs";

export async function getAlbumSelecao() {
    try {
        const row = await queryOne("SELECT ids FROM album_selecao WHERE id = 1");
        return validarSelecao(row ? JSON.parse(row.ids) : null);
    } catch (error) {
        if (error.code === "ER_NO_SUCH_TABLE") return null;
        // Uma falha no banco não pode voltar a exibir o álbum completo.
        throw error;
    }
}

export async function setAlbumSelecao(ids) {
    const selecao = validarSelecao(ids);
    await db().execute(`CREATE TABLE IF NOT EXISTS album_selecao (
        id TINYINT NOT NULL PRIMARY KEY, ids MEDIUMTEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db().execute("INSERT INTO album_selecao (id, ids) VALUES (1, ?) ON DUPLICATE KEY UPDATE ids = VALUES(ids)", [JSON.stringify(selecao)]);
    return selecao;
}
