import noticiasGuardadas from '../data/noticias.json';
import evergreenGuardadas from '../data/evergreen.json';


/* ==================================================
   FECHA
================================================== */

function fecha(noticia = {}) {
  return Date.parse(
    noticia.created_at ||
    noticia.fecha ||
    ''
  ) || 0;
}


/* ==================================================
   NOTICIAS NORMALES

   IMPORTANTE:
   SOLO noticias.json
================================================== */

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
   EVERGREEN

   IMPORTANTE:
   SOLO evergreen.json
================================================== */

function todasEvergreen() {

  return [...evergreenGuardadas]
    .filter(
      (noticia) =>
        noticia &&
        noticia.publicado !== false
    );
}


/* ==================================================
   TODAS LAS NOTICIAS NORMALES
================================================== */

export async function cargarTodasLasNoticias() {

  return todasPublicadas();

}


/* ==================================================
   FEED PRINCIPAL

   SOLO noticias.json

   evergreen.json JAMÁS entra aquí.
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

   SOLO noticias.json
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

   SOLO noticias.json
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
   REPÚBLICA ÚTIL

   AQUÍ SÍ LEEMOS evergreen.json

   También conservamos cualquier República Útil
   antigua que ya exista en noticias.json.
================================================== */

export async function cargarRepublicaUtil() {

  const antiguas =
    todasPublicadas()
      .filter(
        (noticia) =>
          noticia.republica_util === true
      );

  const evergreen =
    todasEvergreen();

  const resultado = [];

  const usados = new Set();

  for (
    const noticia of [
      ...evergreen,
      ...antiguas
    ]
  ) {

    const clave =
      String(
        noticia.slug ||
        noticia.id ||
        noticia.titulo
      );

    if (usados.has(clave)) {
      continue;
    }

    usados.add(clave);

    resultado.push(noticia);
  }

  return resultado;
}


/* ==================================================
   REPÚBLICA ÚTIL — PORTADA

   SOLO ESTA FUNCIÓN UTILIZA evergreen.json

   PRIORIDAD:

   1. Seleccionadas manualmente.
   2. Pasaporte.
   3. Cédula.
   4. Licencia.
   5. Vehículos.
   6. Actas.
   7. Buena conducta.
   8. Prestaciones.
   9. AFP / ARS.
================================================== */

export async function cargarRepublicaUtilPortada(
  limite = 9
) {

  const cantidad =
    Math.max(
      1,
      Number(limite) || 9
    );


  /* ================================================
     REPÚBLICA ÚTIL ANTIGUA
  ================================================= */

  const antiguas =
    todasPublicadas()
      .filter(
        (noticia) =>
          noticia.republica_util === true
      );


  /* ================================================
     NUEVAS EVERGREEN
  ================================================= */

  const evergreen =
    todasEvergreen();


  /* ================================================
     UNIFICAR
  ================================================= */

  const todas = [
    ...evergreen,
    ...antiguas
  ];


  /* ================================================
     PRIORIDADES
  ================================================= */

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


  /* ================================================
     CALCULAR PRIORIDAD
  ================================================= */

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
            (p) =>
              p.length > 3
          );

      const coincideSlug =
        partes.every(
          (p) =>
            slug.includes(p)
        );

      const coincideTitulo =
        partes.every(
          (p) =>
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


  /* ================================================
     SELECCIONADAS MANUALMENTE
  ================================================= */

  const manuales =
    todas
      .filter(
        (noticia) =>
          noticia.republica_util_portada === true
      );


  /* ================================================
     AUTOMÁTICAS
  ================================================= */

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

          return 0;
        }
      );


  /* ================================================
     EVITAR DUPLICADOS
  ================================================= */

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
        noticia.slug ||
        noticia.id ||
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