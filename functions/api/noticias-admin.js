
const GITHUB_OWNER = "pelotainvernal2018rd-cpu";
const GITHUB_REPO = "republica-actual";
const GITHUB_BRANCH = "main";

const ARCHIVO_NOTICIAS = "src/data/noticias.json";
const ARCHIVO_EVERGREEN = "src/data/evergreen.json";

function respuesta(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function headersGithub(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Republica-Actual-Admin",
  };
}

async function validarUsuario(request, env) {
  const auth = request.headers.get("Authorization") || "";

  if (!auth.startsWith("Bearer ")) {
    throw new Error("Sesión de administrador no encontrada.");
  }

  const idToken = auth.substring("Bearer ".length).trim();

  if (!idToken) {
    throw new Error("Token de administrador vacío.");
  }

  if (!env.FIREBASE_API_KEY) {
    throw new Error("Falta FIREBASE_API_KEY en Cloudflare.");
  }

  const url =
    "https://identitytoolkit.googleapis.com/" +
    `v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  if (!r.ok) {
    throw new Error(
      "La sesión del administrador es inválida o venció."
    );
  }

  const data = await r.json();

  if (!data.users || !data.users.length) {
    throw new Error("Usuario administrador no autorizado.");
  }

  return data.users[0];
}

function normalizarId(valor) {
  return String(valor ?? "").trim();
}

function ordenarNoticias(noticias) {
  return [...noticias].sort((a, b) => {
    const fechaA = new Date(
      a.created_at || a.updated_at || 0
    ).getTime();

    const fechaB = new Date(
      b.created_at || b.updated_at || 0
    ).getTime();

    return fechaB - fechaA;
  });
}

function extraerLista(json, ruta) {
  if (Array.isArray(json)) {
    return { lista: json, clave: null };
  }

  for (const clave of [
    "noticias",
    "entradas",
    "articulos",
    "items",
    "evergreen",
  ]) {
    if (Array.isArray(json?.[clave])) {
      return { lista: json[clave], clave };
    }
  }

  throw new Error(
    `Estructura no reconocida en ${ruta}; no se modificó ningún archivo.`
  );
}

async function leerFuentePublica(ruta) {
  const url =
    `https://raw.githubusercontent.com/` +
    `${GITHUB_OWNER}/${GITHUB_REPO}/` +
    `${GITHUB_BRANCH}/${ruta}?t=${Date.now()}`;

  const r = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!r.ok) {
    throw new Error(
      `No se pudo leer ${ruta}: HTTP ${r.status}`
    );
  }

  const original = await r.json();
  const { lista, clave } = extraerLista(original, ruta);

  return { original, lista, clave, ruta };
}

async function leerFuenteParaEscritura(token, ruta) {
  const url =
    `https://api.github.com/repos/` +
    `${GITHUB_OWNER}/${GITHUB_REPO}/contents/` +
    `${ruta}?ref=${GITHUB_BRANCH}`;

  const r = await fetch(url, {
    headers: headersGithub(token),
    cache: "no-store",
  });

  if (!r.ok) {
    throw new Error(
      `No se pudo leer ${ruta} para editar: HTTP ${r.status}`
    );
  }

  const info = await r.json();

  if (!info.sha) {
    throw new Error(
      `GitHub no devolvió SHA de ${ruta}`
    );
  }

  const fuente = await leerFuentePublica(ruta);

  return { ...fuente, sha: info.sha };
}

function reconstruir(fuente, lista) {
  return fuente.clave
    ? { ...fuente.original, [fuente.clave]: lista }
    : lista;
}

async function guardarFuente(token, fuente, lista, mensaje) {
  const ruta = fuente.ruta;

  const contenido = JSON.stringify(
    reconstruir(fuente, lista),
    null,
    2
  );

  const bytes = new TextEncoder().encode(contenido);

  let binario = "";

  for (let i = 0; i < bytes.length; i += 8192) {
    binario += String.fromCharCode(
      ...bytes.subarray(i, i + 8192)
    );
  }

  const url =
    `https://api.github.com/repos/` +
    `${GITHUB_OWNER}/${GITHUB_REPO}/contents/${ruta}`;

  const r = await fetch(url, {
    method: "PUT",
    headers: headersGithub(token),
    body: JSON.stringify({
      message: mensaje,
      content: btoa(binario),
      sha: fuente.sha,
      branch: GITHUB_BRANCH,
    }),
  });

  if (!r.ok) {
    const detalle = await r.text();

    throw new Error(
      `GitHub no guardó ${ruta}: HTTP ${r.status}. ` +
      detalle.slice(0, 500)
    );
  }

  return await r.json();
}

function prepararNoticia(datos) {
  if (
    !datos ||
    typeof datos !== "object" ||
    Array.isArray(datos)
  ) {
    throw new Error("Datos de noticia inválidos");
  }

  const copia = { ...datos };
  delete copia.__fuente;

  return copia;
}

async function localizarId(token, id) {
  const fuentes = await Promise.all([
    leerFuenteParaEscritura(token, ARCHIVO_NOTICIAS),
    leerFuenteParaEscritura(token, ARCHIVO_EVERGREEN),
  ]);

  const encontrados = [];

  for (const fuente of fuentes) {
    const indice = fuente.lista.findIndex(
      n => normalizarId(n.id) === normalizarId(id)
    );

    if (indice !== -1) {
      encontrados.push({ fuente, indice });
    }
  }

  if (encontrados.length > 1) {
    throw new Error(
      "ID duplicado entre archivos. Operación cancelada para proteger los datos."
    );
  }

  return encontrados[0] || null;
}

/* =========================================
   GET - CARGAR TODAS LAS NOTICIAS
========================================= */

export async function onRequestGet({ request, env }) {
  try {
    await validarUsuario(request, env);

    const [normales, permanentes] = await Promise.all([
      leerFuentePublica(ARCHIVO_NOTICIAS),
      leerFuentePublica(ARCHIVO_EVERGREEN),
    ]);

    const noticias = ordenarNoticias([
      ...normales.lista.map(n => ({
        ...n,
        __fuente: "noticias",
      })),
      ...permanentes.lista.map(n => ({
        ...n,
        __fuente: "evergreen",
      })),
    ]);

    return respuesta({
      ok: true,
      total: noticias.length,
      noticias,
    });
  } catch (error) {
    return respuesta({
      ok: false,
      error: String(error?.message || error),
    }, 500);
  }
}

/* =========================================
   POST - CREAR NOTICIA
========================================= */

export async function onRequestPost({ request, env }) {
  try {
    await validarUsuario(request, env);

    const token = env.GITHUB_TOKEN;

    if (!token) {
      throw new Error(
        "Falta GITHUB_TOKEN en Cloudflare"
      );
    }

    const body = await request.json();
    const datos = prepararNoticia(body.noticia ?? body);

    const fuente = await leerFuenteParaEscritura(
      token,
      ARCHIVO_NOTICIAS
    );

    const id = datos.id || Date.now();

    if (
      fuente.lista.some(
        n => normalizarId(n.id) === normalizarId(id)
      )
    ) {
      throw new Error("El ID ya existe");
    }

    const noticia = {
      ...datos,
      id,
      created_at:
        datos.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await guardarFuente(
      token,
      fuente,
      [noticia, ...fuente.lista],
      `Publicar noticia: ${noticia.titulo || id}`
    );

    return respuesta({
      ok: true,
      noticia: {
        ...noticia,
        __fuente: "noticias",
      },
    });
  } catch (error) {
    return respuesta({
      ok: false,
      error: String(error?.message || error),
    }, 500);
  }
}

/* =========================================
   PUT - EDITAR NOTICIA
========================================= */

export async function onRequestPut({ request, env }) {
  try {
    await validarUsuario(request, env);

    const token = env.GITHUB_TOKEN;

    if (!token) {
      throw new Error(
        "Falta GITHUB_TOKEN en Cloudflare"
      );
    }

    const body = await request.json();
    const id = body.id ?? body.noticia?.id;

    if (!id) {
      return respuesta({
        ok: false,
        error: "Falta ID",
      }, 400);
    }

    const hallado = await localizarId(token, id);

    if (!hallado) {
      return respuesta({
        ok: false,
        error:
          "La noticia no existe en ninguno de los dos archivos",
      }, 404);
    }

    const { fuente, indice } = hallado;
    const datos = prepararNoticia(body.noticia ?? body);
    const anterior = fuente.lista[indice];

    const noticia = {
      ...anterior,
      ...datos,
      id: anterior.id,
      slug: anterior.slug,
      created_at:
        anterior.created_at || datos.created_at,
      updated_at: new Date().toISOString(),
    };

    const nuevas = [...fuente.lista];
    nuevas[indice] = noticia;

    await guardarFuente(
      token,
      fuente,
      nuevas,
      `Actualizar noticia: ${noticia.titulo || id}`
    );

    return respuesta({
      ok: true,
      noticia: {
        ...noticia,
        __fuente:
          fuente.ruta === ARCHIVO_EVERGREEN
            ? "evergreen"
            : "noticias",
      },
    });
  } catch (error) {
    return respuesta({
      ok: false,
      error: String(error?.message || error),
    }, 500);
  }
}

/* =========================================
   DELETE - ELIMINAR NOTICIA
========================================= */

export async function onRequestDelete({ request, env }) {
  try {
    await validarUsuario(request, env);

    const token = env.GITHUB_TOKEN;

    if (!token) {
      throw new Error(
        "Falta GITHUB_TOKEN en Cloudflare"
      );
    }

    let body = {};

    try {
      body = await request.json();
    } catch {}

    const id =
      body.id ??
      new URL(request.url).searchParams.get("id");

    if (!id) {
      return respuesta({
        ok: false,
        error: "Falta ID",
      }, 400);
    }

    const hallado = await localizarId(token, id);

    if (!hallado) {
      return respuesta({
        ok: false,
        error: "La noticia no existe",
      }, 404);
    }

    const { fuente, indice } = hallado;
    const noticia = fuente.lista[indice];

    const nuevas = fuente.lista.filter(
      (_, i) => i !== indice
    );

    await guardarFuente(
      token,
      fuente,
      nuevas,
      `Eliminar noticia: ${noticia.titulo || id}`
    );

    return respuesta({
      ok: true,
      eliminado: id,
      titulo: noticia.titulo || "",
    });
  } catch (error) {
    return respuesta({
      ok: false,
      error: String(error?.message || error),
    }, 500);
  }
}
