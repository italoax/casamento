export function Modal({ title, children, onClose, id, showTitle = true }: any) {
  return (
    <div id={id} className="modal-painel aberto" role="dialog" aria-modal="true">
      <div className="modal-conteudo">
        <button type="button" className="fechar-modal" onClick={onClose} aria-label="Fechar modal">
          ×
        </button>
        {showTitle ? <h3 className="modal-title">{title}</h3> : null}
        {children}
      </div>
    </div>
  );
}
