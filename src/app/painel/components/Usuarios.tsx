"use client";

import { useEffect, useState } from "react";

type Usuario = { id: number; usuario: string; role: string; ativo: number; twofa_enabled: number; created_at: string };

const ROLE_LABELS: Record<string, string> = { admin: "Admin (total)", gerente: "Gerente", assistente: "Assistente" };
const ROLE_DESC: Record<string, string> = {
  admin: "Acesso total ao painel, backups e segurança.",
  gerente: "Convidados, presentes, recados, vendas e WhatsApp.",
  assistente: "Apenas convidados e recados.",
};

export function Usuarios({ onToast, meuId }: { onToast: (m: string) => void; meuId: number }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalCriar, setModalCriar] = useState(false);
  const [modalSenha, setModalSenha] = useState<number | null>(null);
  const [novoUser, setNovoUser] = useState("");
  const [novoSenha, setNovoSenha] = useState("");
  const [novoRole, setNovoRole] = useState("assistente");
  const [resetSenha, setResetSenha] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/painel/usuarios", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) setUsuarios(body.usuarios || []);
    } catch { /* silencioso */ }
    finally { setCarregando(false); }
  }

  useEffect(() => { void carregar(); }, []);

  async function acao(payload: Record<string, unknown>, msg: string) {
    setOcupado(true);
    try {
      const res = await fetch("/api/painel/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) { onToast(msg); await carregar(); }
      else onToast(body.erro || "Falha na operação.");
    } finally { setOcupado(false); }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!novoUser.trim() || !novoSenha) return;
    await acao({ acao: "criar", usuario: novoUser, senha: novoSenha, role: novoRole }, "Usuário criado.");
    setModalCriar(false);
    setNovoUser("");
    setNovoSenha("");
    setNovoRole("assistente");
  }

  async function resetarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (!modalSenha || !resetSenha) return;
    await acao({ acao: "resetar_senha", id: modalSenha, senha: resetSenha }, "Senha alterada.");
    setModalSenha(null);
    setResetSenha("");
  }

  return (
    <div id="tab-usuarios" className="tab-conteudo ativo">
      <div className="painel-header compact"><h3 className="painel-subtitulo">Usuários do Painel</h3></div>
      <div className="resumo-mini resumo-mini--stats">
        <span className="toolbar-pill"><span className="rp-label">Usuários</span><span className="rp-num">{usuarios.length}</span></span>
      </div>
      <div className="barra-ferramentas barra-ferramentas--mini">
        <button type="button" className="toolbar-btn toolbar-btn--primary" onClick={() => setModalCriar(true)}>+ Novo usuário</button>
      </div>

      <div className="tabela-container">
        <table>
          <thead><tr><th>Usuário</th><th>Role</th><th>Status</th><th>2FA</th><th>Ações</th></tr></thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={5} className="table-empty">Carregando...</td></tr>
            ) : usuarios.length ? usuarios.map((u) => (
              <tr key={u.id}>
                <td data-label="Usuário"><strong>{u.usuario}</strong>{u.id === meuId ? <span className="toolbar-pill" style={{ marginLeft: 8, fontSize: "0.7rem" }}>você</span> : null}</td>
                <td data-label="Role">
                  {u.id === meuId ? (
                    <span className="toolbar-pill">{ROLE_LABELS[u.role] || u.role}</span>
                  ) : (
                    <select value={u.role} onChange={(e) => void acao({ acao: "alterar_role", id: u.id, role: e.target.value }, "Role alterado.")} disabled={ocupado}>
                      <option value="admin">Admin (total)</option>
                      <option value="gerente">Gerente</option>
                      <option value="assistente">Assistente</option>
                    </select>
                  )}
                </td>
                <td data-label="Status">
                  <span className={`status-badge ${u.ativo ? "confirmado" : "recusado"}`}>{u.ativo ? "Ativo" : "Inativo"}</span>
                </td>
                <td data-label="2FA">{u.twofa_enabled ? "Ativado" : "Desativado"}</td>
                <td data-label="Ações">
                  {u.id !== meuId ? (
                    <div className="acoes-btn">
                      <button type="button" className="toolbar-btn" onClick={() => void acao({ acao: "alternar_ativo", id: u.id }, u.ativo ? "Usuário desativado." : "Usuário ativado.")} disabled={ocupado}>
                        {u.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button type="button" className="toolbar-btn" onClick={() => { setModalSenha(u.id); setResetSenha(""); }} disabled={ocupado}>Resetar senha</button>
                      <button type="button" className="toolbar-btn" style={{ background: "#9b2f3d", borderColor: "#9b2f3d", color: "#fff" }} onClick={() => confirm(`Excluir o usuário "${u.usuario}"?`) && void acao({ acao: "excluir", id: u.id }, "Usuário excluído.")} disabled={ocupado}>Excluir</button>
                    </div>
                  ) : <span style={{ opacity: 0.5 }}>-</span>}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="table-empty">Nenhum usuário.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, fontSize: "0.85rem", opacity: 0.8, lineHeight: 1.6 }}>
        <strong>Roles:</strong><br />
        {Object.entries(ROLE_DESC).map(([role, desc]) => (
          <span key={role}><strong>{ROLE_LABELS[role]}</strong>: {desc}<br /></span>
        ))}
      </div>

      {/* Modal criar usuário */}
      {modalCriar ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setModalCriar(false)}>
          <div className="modal-content usr-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setModalCriar(false)} aria-label="Fechar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            <div className="usr-modal__icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            </div>
            <h3 className="usr-modal__title">Criar novo usuário</h3>
            <p className="usr-modal__sub">Defina as credenciais e o nível de acesso.</p>
            <form onSubmit={criar} className="usr-modal__form">
              <div className="usr-field">
                <label>Usuário</label>
                <input type="text" value={novoUser} onChange={(e) => setNovoUser(e.target.value)} placeholder="nome de login" minLength={3} maxLength={120} required />
              </div>
              <div className="usr-field">
                <label>Senha</label>
                <input type="text" value={novoSenha} onChange={(e) => setNovoSenha(e.target.value)} placeholder="min. 8 caracteres" minLength={8} required />
              </div>
              <div className="usr-field">
                <label>Nível de acesso</label>
                <div className="usr-roles">
                  {(["assistente", "gerente"] as const).map((r) => (
                    <button key={r} type="button" className={`usr-role-card ${novoRole === r ? "usr-role-card--active" : ""}`} onClick={() => setNovoRole(r)}>
                      <strong>{ROLE_LABELS[r]}</strong>
                      <span>{ROLE_DESC[r]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="usr-modal__actions">
                <button type="button" className="toolbar-btn" onClick={() => setModalCriar(false)}>Cancelar</button>
                <button type="submit" className="toolbar-btn toolbar-btn--primary" disabled={ocupado}>{ocupado ? "Criando..." : "Criar usuário"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Modal resetar senha */}
      {modalSenha ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setModalSenha(null)}>
          <div className="modal-content usr-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setModalSenha(null)} aria-label="Fechar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            <div className="usr-modal__icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
            <h3 className="usr-modal__title">Resetar senha</h3>
            <p className="usr-modal__sub">Usuário: <strong>{usuarios.find((u) => u.id === modalSenha)?.usuario}</strong></p>
            <form onSubmit={resetarSenha} className="usr-modal__form">
              <div className="usr-field">
                <label>Nova senha</label>
                <input type="text" value={resetSenha} onChange={(e) => setResetSenha(e.target.value)} placeholder="min. 8 caracteres" minLength={8} required />
              </div>
              <div className="usr-modal__actions">
                <button type="button" className="toolbar-btn" onClick={() => setModalSenha(null)}>Cancelar</button>
                <button type="submit" className="toolbar-btn toolbar-btn--primary" disabled={ocupado}>{ocupado ? "Salvando..." : "Salvar nova senha"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
