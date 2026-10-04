import noticiasGuardadas from '../data/noticias.json';

function fecha(noticia = {}) {
  return Date.parse(noticia.created_at || noticia.fecha || '') || 0;
}

function todasPublicadas() {
  return [...noticiasGuardadas]
    .filter((noticia) => noticia && noticia.publicado !== false)
    .sort((a, b) => fecha(b) - fecha(a));
}

export async function cargarTodasLasNoticias() {
  return todasPublicadas();
}

export async function cargarNoticiasPublicadas(limite = 20) {
  const noticias = todasPublicadas()
    .filter((noticia) => noticia.feed_principal !== false);

  if (limite === null || limite === undefined) {
    return noticias;
  }

  const cantidad = Math.max(1, Number(limite) || 20);
  return noticias.slice(0, cantidad);
}

export async function contarNoticiasPublicadas() {
  return todasPublicadas()
    .filter((noticia) => noticia.feed_principal !== false)
    .length;
}

export async function cargarNoticiasParaPaginacion(porPagina = 10) {
  const cantidadPorPagina = Math.max(1, Number(porPagina) || 10);

  const todas = todasPublicadas()
    .filter((noticia) => noticia.feed_principal !== false);

  const total = todas.length;
  const totalPaginas = Math.max(
    1,
    Math.ceil(total / cantidadPorPagina)
  );

  const paginas = [];

  for (let pagina = 2; pagina <= totalPaginas; pagina++) {
    const inicio = (pagina - 1) * cantidadPorPagina;

    paginas.push({
      pagina,
      noticias: todas.slice(
        inicio,
        inicio + cantidadPorPagina
      )
    });
  }

  return {
    paginas,
    totalPaginas,
    total
  };
}

export async function cargarRepublicaUtilPortada(limite = 9) {
  const cantidad = Math.max(1, Number(limite) || 9);

  return todasPublicadas()
    .filter(
      (noticia) =>
        noticia.republica_util_portada === true
    )
    .slice(0, cantidad);
}
