/**
 * Gera o comando SQL para criar um usuário ADMIN do painel, com a senha
 * já criptografada (bcrypt) — a senha nunca fica em texto puro no banco.
 *
 * Uso (na raiz do projeto):
 *   node database/criar-admin.mjs <usuario> "<senha>"
 *
 * Exemplo:
 *   node database/criar-admin.mjs admin "MinhaSenhaForte123!"
 *
 * Copie o INSERT impresso e rode no seu banco (phpMyAdmin -> SQL, ou cliente MySQL).
 */
import bcrypt from "bcryptjs";

const usuario = process.argv[2];
const senha = process.argv[3];

if (!usuario || !senha) {
  console.error('Uso: node database/criar-admin.mjs <usuario> "<senha>"');
  console.error('Ex.: node database/criar-admin.mjs admin "MinhaSenhaForte123!"');
  process.exit(1);
}

if (senha.length < 8) {
  console.error("A senha deve ter pelo menos 8 caracteres.");
  process.exit(1);
}

const hash = bcrypt.hashSync(senha, 10);
const esc = (s) => String(s).replace(/'/g, "''");

console.log("");
console.log("-- ===== Rode este comando no seu banco (phpMyAdmin -> SQL) ===== --");
console.log(`INSERT INTO usuarios (usuario, senha, role, permissoes, ativo, twofa_enabled)`);
console.log(`VALUES ('${esc(usuario)}', '${hash}', 'admin', NULL, 1, 0);`);
console.log("");
console.log(`-- Login: usuario = "${usuario}"  | senha = (a que você digitou)`);
console.log("-- 2FA fica desativado (twofa_enabled = 0); dá pra ativar depois no painel.");
