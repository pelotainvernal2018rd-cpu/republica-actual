import noticiasGuardadas from '../data/noticias.json';

function fecha(noticia = {}) {
  return Date.parse(
    noticia.created_at ||
    noticia.fecha ||
    ''
  ) || 0;
}

function todasPublicadas() {
  return [...noticiasGuardadas]
    .filter(
      (noticia) =>
        noticia &&
        noticia.publicado !== false
    )
    .sort(
      (a, b) =>
        fecha(b) - fecha(a)
    );
}

/* ==================================================
   TODAS LAS NOTICIAS
================================================== */

export async function cargarTodasLasNoticias() {
  return todasPublicadas();
}

/* ==================================================
   FEED PRINCIPAL

   IMPORTANTE:
   República Útil NO entra aquí cuando
   feed_principal === false
================================================== */

export async function cargarNoticiasPublicadas(
  limite = 20
) {

  const noticias =
    todasPublicadas()
      .filter(
        (noticia) =>
          noticia.feed_principal !== false
      );

  if (
    limite === null ||
    limite === undefined
  ) {
    return noticias;
  }

  const cantidad =
    Math.max(
      1,
      Number(limite) || 20
    );

  return noticias.slice(
    0,
    cantidad
  );
}

/* ==================================================
   TOTAL DEL FEED PRINCIPAL
================================================== */

export async function contarNoticiasPublicadas() {

  return todasPublicadas()
    .filter(
      (noticia) =>
        noticia.feed_principal !== false
    )
    .length;
}

/* ==================================================
   PAGINACIÓN NORMAL
================================================== */

export async function cargarNoticiasParaPaginacion(
  porPagina = 10
) {

  const cantidadPorPagina =
    Math.max(
      1,
      Number(porPagina) || 10
    );

  const todas =
    todasPublicadas()
      .filter(
        (noticia) =>
          noticia.feed_principal !== false
      );

  const total =
    todas.length;

  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        total /
        cantidadPorPagina
      )
    );

  const paginas = [];

  for (
    let pagina = 2;
    pagina <= totalPaginas;
    pagina++
  ) {

    const inicio =
      (pagina - 1) *
      cantidadPorPagina;

    paginas.push({
      pagina,

      noticias:
        todas.slice(
          inicio,
          inicio +
          cantidadPorPagina
        )
    });
  }

  return {
    paginas,
    totalPaginas,
    total
  };
}

/* ==================================================
   TODAS LAS NOTICIAS DE REPÚBLICA ÚTIL
================================================== */

export async function cargarRepublicaUtil() {

  return todasPublicadas()
    .filter(
      (noticia) =>
        noticia.republica_util === true
    );
}

/* ==================================================
   REPÚBLICA ÚTIL — PORTADA

   ORDEN:

   1. Las seleccionadas manualmente para portada.
   2. Luego las evergreen prioritarias.
   3. Completa hasta 9 con otras República Útil.
================================================== */

export async function cargarRepublicaUtilPortada(
  limite = 9
) {

  const cantidad =
    Math.max(
      1,
      Number(limite) || 9
    );

  const todas =
    todasPublicadas()
      .filter(
        (noticia) =>
          noticia.republica_util === true
      );

  /*
    Temas evergreen con mayor interés
    permanente para la portada.
  */

  const prioridades = [
    'pasaporte-dominicano-por-primera-vez',
    'cedula-dominicana-por-primera-vez',
    'renovar-la-licencia-de-conducir',
    'traspaso-de-un-vehiculo',
    'acta-de-nacimiento',
    'certificado-de-buena-conducta',
    'prestaciones-laborales',
    'consultar-tu-afp',
    'consultar-tu-ars'
  ];

  function prioridad(noticia) {

    const slug =
      String(
        noticia.slug || ''
      ).toLowerCase();

    const titulo =
      String(
        noticia.titulo || ''
      ).toLowerCase();

    for (
      let i = 0;
      i < prioridades.length;
      i++
    ) {

      const palabra =
        prioridades[i];

      const partes =
        palabra
          .split('-')
          .filter(
            p =>
              p.length > 3
          );

      const coincideSlug =
        partes.every(
          p =>
            slug.includes(p)
        );

      const coincideTitulo =
        partes.every(
          p =>
            titulo.includes(p)
        );

      if (
        coincideSlug ||
        coincideTitulo
      ) {
        return i;
      }
    }

    return 999;
  }

  /*
    Primero respetamos cualquier noticia
    seleccionada manualmente.
  */

  const manuales =
    todas
      .filter(
        (noticia) =>
          noticia.republica_util_portada === true
      );

  /*
    Luego ordenamos las demás
    por prioridad evergreen.
  */

  const automaticas =
    todas
      .filter(
        (noticia) =>
          noticia.republica_util_portada !== true
      )
      .sort(
        (a, b) => {

          const prioridadA =
            prioridad(a);

          const prioridadB =
            prioridad(b);

          if (
            prioridadA !==
            prioridadB
          ) {
            return (
              prioridadA -
              prioridadB
            );
          }

          return (
            fecha(b) -
            fecha(a)
          );
        }
      );

  /*
    Evitamos duplicados.
  */

  const resultado = [];

  const usados =
    new Set();

  for (
    const noticia of [
      ...manuales,
      ...automaticas
    ]
  ) {

    const clave =
      String(
        noticia.id ||
        noticia.slug ||
        noticia.titulo
      );

    if (
      usados.has(clave)
    ) {
      continue;
    }

    usados.add(clave);

    resultado.push(
      noticia
    );

    if (
      resultado.length >=
      cantidad
    ) {
      break;
    }
  }

  return resultado;
}