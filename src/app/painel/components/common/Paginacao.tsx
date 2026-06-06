export function Paginacao({ pagina, total, limite, onChange }: { pagina: number; total: number; limite: number; onChange: any }) {
  const totalPaginas = Math.max(1, Math.ceil((total || 0) / (limite || 10)));
  if (totalPaginas <= 1) return null;

  return (
    <div className="paginacao">
      <button type="button" className="page-btn" disabled={pagina <= 1} onClick={() => onChange(pagina - 1)}>
        Anterior
      </button>
      <span>Página {pagina} de {totalPaginas}</span>
      <button type="button" className="page-btn" disabled={pagina >= totalPaginas} onClick={() => onChange(pagina + 1)}>
        Próxima
      </button>
    </div>
  );
}
