// Executar antes de carregar o Next/sharp. O pool V8 é definido pelo lançador
// da hospedagem; alterar NODE_OPTIONS aqui não muda o processo atual.
for (const [key, fallback] of Object.entries({
    UV_THREADPOOL_SIZE: "2",
    RAYON_NUM_THREADS: "1",
    VIPS_CONCURRENCY: "1",
})) {
    if (!process.env[key]) process.env[key] = fallback;
}
