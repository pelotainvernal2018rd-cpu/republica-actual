
/*
 * REPÚBLICA ACTUAL
 * Redirecciones SEO 301 de noticias antiguas.
 *
 * Archivo: functions/_middleware.js
 *
 * No modifica noticias, diseño ni publicaciones.
 * Consulta el JSON público de GitHub.
 */

const URL_NOTICIAS =
  "https://raw.githubusercontent.com/" +
  "pelotainvernal2018rd-cpu/" +
  "republica-actual/main/src/data/noticias.json";

const CACHE_SEGUNDOS = 3600;

let mapaEnMemoria = null;
let ultimaCarga = 0;

async function cargarMapa() {
  const ahora = Date.now();

  if (
    mapaEnMemoria &&
    ahora - ultimaCarga < CACHE_SEGUNDOS * 1000
  ) {
    return mapaEnMemoria;
  }

  const respuesta = await fetch(URL_NOTICIAS, {
    headers: {
      Accept: "application/json"
    },
    cf: {
      cacheEverything: true,
      cacheTtl: CACHE_SEGUNDOS
    }
  });

  if (!respuesta.ok) {
    throw new Error(
      "No se pudo consultar noticias.json: " +
      respuesta.status
    );
  }

  const datos = await respuesta.json();

  if (!Array.isArray(datos)) {
    throw new Error(
      "El archivo noticias.json no contiene una lista válida."
    );
  }

  const mapa = new Map();

  for (const noticia of datos) {
    if (!noticia || noticia.publicado === false) {
      continue;
    }

    const id = String(noticia.id ?? "").trim();
    const slug = String(noticia.slug ?? "").trim();

    if (
      !/^\d+$/.test(id) ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ) {
      continue;
    }

    mapa.set(id, slug);
  }

  mapaEnMemoria = mapa;
  ultimaCarga = ahora;

  return mapa;
}

function obtenerIdAntiguo(url) {
  const ruta = url.pathname.replace(/\/+$/, "");

  // Formato antiguo: /noticia?id=123
  // También acepta: /noticia/?id=123
  if (ruta === "/noticia") {
    const id = url.searchParams.get("id");

    if (id && /^\d+$/.test(id)) {
      return id;
    }

    return null;
  }

  // Formato antiguo: /noticia/123/
  const coincidencia = ruta.match(
    /^\/noticia\/(\d+)$/
  );

  return coincidencia ? coincidencia[1] : null;
}

export async function onRequest(context) {
  const solicitud = context.request;

  if (
    solicitud.method !== "GET" &&
    solicitud.method !== "HEAD"
  ) {
    return context.next();
  }

  const url = new URL(solicitud.url);
  const id = obtenerIdAntiguo(url);

  // No interferir con noticias que ya usan slug.
  if (!id) {
    return context.next();
  }

  try {
    const mapa = await cargarMapa();
    const slug = mapa.get(id);

    // No inventar destinos para IDs desconocidos.
    if (!slug) {
      return context.next();
    }

    const destino = new URL(
      "/noticia/" + slug + "/",
      url.origin
    );

    return new Response(null, {
      status: 301,
      headers: {
        Location: destino.toString(),
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (error) {
    console.error(
      "República Actual: error en redirecciones SEO",
      error
    );

    // Si GitHub falla, mantener funcionando la web.
    return context.next();
  }
}
