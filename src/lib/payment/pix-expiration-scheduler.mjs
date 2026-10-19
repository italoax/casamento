const MAX_TIMEOUT_MS = 2 ** 31 - 1;
const RETRY_DELAYS = [5000, 15000, 60000];

// Uma instância por processo, compartilhada pelos bundles do Next.
// Sem pendências, não há timer nem polling para descobrir novos pagamentos:
// o próprio INSERT/UPDATE da venda chama refresh().
export function createPixExpirationScheduler({ readNextDelay, expire, onError, setTimer = setTimeout, clearTimer = clearTimeout }) {
    let timer = null;
    let running = null;
    let requested = false;
    let started = false;
    let failures = 0;

    function schedule(delay) {
        clearTimer(timer);
        timer = setTimer(() => {
            timer = null;
            void refresh();
        }, Math.min(MAX_TIMEOUT_MS, Math.max(1, Math.ceil(delay))));
        timer.unref?.();
    }

    async function nextDelay() {
        const value = await readNextDelay();
        if (value === null) return null;
        const delay = Number(value);
        if (!Number.isFinite(delay)) throw new Error("Prazo inválido na fila de expiração de Pix.");
        return delay;
    }

    async function drain() {
        while (requested) {
            requested = false;
            try {
                let delay = await nextDelay();
                if (delay !== null && delay <= 0) {
                    await expire();
                    delay = await nextDelay();
                    // Lote incompleto ou falha transitória: evita um loop ocupado.
                    if (delay !== null && delay <= 0) delay = 60000;
                }
                failures = 0;
                if (requested) continue;
                if (delay !== null) schedule(delay);
            } catch (error) {
                onError(error);
                const retryDelay = RETRY_DELAYS[failures++];
                // Após falhas consecutivas, uma nova criação/atualização ou
                // reinicialização poderá recuperar a fila sem polling infinito.
                if (!requested && retryDelay !== undefined) schedule(retryDelay);
            }
        }
    }

    function refresh() {
        started = true;
        requested = true;
        clearTimer(timer);
        timer = null;
        if (!running) {
            running = Promise.resolve().then(drain).finally(() => {
                running = null;
                if (requested) void refresh();
            });
        }
        return running;
    }

    function start() {
        if (started) return running || Promise.resolve();
        return refresh();
    }

    return { start, refresh };
}
