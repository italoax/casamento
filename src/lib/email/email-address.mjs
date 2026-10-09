// Mantém o usuário intacto e converte apenas domínios internacionais para IDNA.
export function normalizarEmail(valor) {
    if (typeof valor !== "string") return null;
    const email = valor.trim();
    if (!email || /[\s<>(),;"\\\x00-\x1f\x7f]/.test(email)) return null;
    const partes = email.split("@");
    if (partes.length !== 2) return null;
    const [usuario, dominio] = partes;
    if (!/^[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~.]+$/.test(usuario) || usuario.length > 64 || usuario.startsWith(".") || usuario.endsWith(".") || usuario.includes("..")) return null;
    if (!dominio || /[/:#?@\[\]%]/.test(dominio)) return null;
    let ascii;
    try { ascii = new URL(`http://${dominio}`).hostname.toLowerCase(); } catch { return null; }
    if (!ascii || ascii.length > 253 || !ascii.includes(".") || ascii.split(".").some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
    const normalizado = `${usuario}@${ascii}`;
    return normalizado.length <= 150 ? normalizado : null;
}
