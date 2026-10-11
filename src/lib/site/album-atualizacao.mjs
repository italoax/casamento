const EVENTO = "album-selecao-atualizada";
const ORIGEM = `${Date.now()}-${Math.random()}`;

export function notificarAlbumAtualizado() {
    window.dispatchEvent(new Event(EVENTO));
    try {
        if (typeof BroadcastChannel !== "undefined") {
            const canal = new BroadcastChannel(EVENTO);
            canal.postMessage({ origem: ORIGEM });
            canal.close();
            return;
        }
    } catch { /* Usa storage quando o canal não estiver disponível. */ }
    try { window.localStorage.setItem(EVENTO, `${Date.now()}-${Math.random()}`); }
    catch { /* O salvamento continua válido com storage bloqueado. */ }
}

export function observarAlbumAtualizado(atualizar) {
    let canal;
    try {
        if (typeof BroadcastChannel !== "undefined") {
            canal = new BroadcastChannel(EVENTO);
            canal.onmessage = event => { if (event.data?.origem !== ORIGEM) atualizar(); };
        }
    } catch { /* O listener de storage cobre navegadores sem canal. */ }
    const storage = event => { if (event.key === EVENTO) atualizar(); };
    window.addEventListener(EVENTO, atualizar);
    window.addEventListener("storage", storage);
    return () => {
        canal?.close();
        window.removeEventListener(EVENTO, atualizar);
        window.removeEventListener("storage", storage);
    };
}
