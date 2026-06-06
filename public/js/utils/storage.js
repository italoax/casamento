function salvarNoLocalStorage(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch (err) {
    return false;
  }
}

function lerDoLocalStorage(chave, valorPadrao = null) {
  try {
    const valor = localStorage.getItem(chave);
    return valor ? JSON.parse(valor) : valorPadrao;
  } catch (err) {
    return valorPadrao;
  }
}

function removerDoLocalStorage(chave) {
  try {
    localStorage.removeItem(chave);
    return true;
  } catch (err) {
    return false;
  }
}

function salvarNoSessionStorage(chave, valor) {
  try {
    sessionStorage.setItem(chave, typeof valor === "string" ? valor : JSON.stringify(valor));
    return true;
  } catch (err) {
    return false;
  }
}

function lerDoSessionStorage(chave, valorPadrao = null) {
  try {
    const valor = sessionStorage.getItem(chave);
    if (!valor) return valorPadrao;
    try {
      return JSON.parse(valor);
    } catch {
      return valor;
    }
  } catch (err) {
    return valorPadrao;
  }
}

function removerDoSessionStorage(chave) {
  try {
    sessionStorage.removeItem(chave);
    return true;
  } catch (err) {
    return false;
  }
}

export { salvarNoLocalStorage, lerDoLocalStorage, removerDoLocalStorage, salvarNoSessionStorage, lerDoSessionStorage, removerDoSessionStorage };
