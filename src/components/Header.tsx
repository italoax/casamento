export function Header() {
  return (
    <header className="cabecalho-principal">
    <nav className="navegacao-principal">
    <a href="#inicio" className="marca-nav"></a>
    <button
    className="alternar-nav"
    aria-label="Abrir menu"
    aria-expanded="false"
    >
    <span className="hamburger"></span>
    </button>
    <ul className="menu-nav"></ul>
    </nav>
    </header>
  );
}
