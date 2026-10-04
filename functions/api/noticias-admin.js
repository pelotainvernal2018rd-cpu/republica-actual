const GITHUB_OWNER = "pelotainvernal2018rd-cpu";
const GITHUB_REPO = "republica-actual";
const GITHUB_BRANCH = "main";
const ARCHIVO_NOTICIAS = "src/data/noticias.json";

function respuesta(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

/* =========================================================
   HEADERS DE GITHUB
   El token SOLO se usa para escribir
========================================================= */

function headersGithub(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Republica-Actual-Admin",
  };
}

/* =========================================================
   LEER NOTICIAS SIN TOKEN
   Usa RAW público de GitHub
========================================================= */

async function obtenerNoticiasPublicas() {
  const url =
    `https://raw.githubusercontent.com/` +
    `${GITHUB_OWNER}/${GITHUB_REPO}/` +
    `${GITHUB_BRANCH}/${ARCHIVO_NOTICIAS}` +
    `?t=${Date.now()}`;

  const r = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Republica-Actual-Admin",
    },
  });

  if (!r.ok) {
    throw new Error(
      `No se pudo descargar noticias.json. HTTP ${r.status}`
    );
  }

  const texto = await r.text();

  let noticias;

  try {
    noticias = JSON.parse(texto);
  } catch (error) {
    throw new Error(
      "El archivo noticias.json contiene JSON inválido."
    );
  }

  if (!Array.isArray(noticias)) {
    throw new Error(
      "noticias.json no contiene una lista de noticias."
    );
  }

  return noticias;
}

/* =========================================================
   OBTENER SHA
   Solo necesario para modificar noticias.json
========================================================= */

async function obtenerSha(token) {
  if (!token) {
    throw new Error(
      "Falta GITHUB_TOKEN en las variables de Cloudflare."
    );
  }

  const url =
    `https://api.github.com/repos/` +
    `${GITHUB_OWNER}/${GITHUB_REPO}/contents/` +
    `${ARCHIVO_NOTICIAS}?ref=${GITHUB_BRANCH}`;

  const r = await fetch(url, {
    headers: headersGithub(token),
  });

  if (!r.ok) {
    const detalle = await r.text();

    throw new Error(
      `GitHub rechazó GITHUB_TOKEN. HTTP ${r.status}. ${detalle}`
    );
  }

  const info = await r.json();

  if (!info.sha) {
    throw new Error(
      "GitHub no devolvió el SHA de noticias.json."
    );
  }

  return info.sha;
}

/* =========================================================
   GUARDAR ARCHIVO COMPLETO EN GITHUB
========================================================= */

async function guardarArchivo(
  token,
  noticias,
  sha,
  mensaje
) {
  if (!token) {
    throw new Error(
      "Falta GITHUB_TOKEN en las variables de Cloudflare."
    );
  }

  const url =
    `https://api.github.com/repos/` +
    `${GITHUB_OWNER}/${GITHUB_REPO}/contents/` +
    `${ARCHIVO_NOTICIAS}`;

  const contenido = JSON.stringify(noticias, null, 2);

  const bytes = new TextEncoder().encode(contenido);

  let binario = "";

  const TAMANO = 8192;

  for (let i = 0; i < bytes.length; i += TAMANO) {
    binario += String.fromCharCode(
      ...bytes.subarray(i, i + TAMANO)
    );
  }

  const base64 = btoa(binario);

  const r = await fetch(url, {
    method: "PUT",

    headers: headersGithub(token),

    body: JSON.stringify({
      message: mensaje,
      content: base64,
      sha: sha,
      branch: GITHUB_BRANCH,
    }),
  });

  if (!r.ok) {
    const detalle = await r.text();

    throw new Error(
      `GitHub rechazó la actualización. HTTP ${r.status}. ${detalle}`
    );
  }

  return await r.json();
}

/* =========================================================
   VALIDAR SESIÓN FIREBASE
========================================================= */

async function validarUsuario(request, env) {
  const auth =
    request.headers.get("Authorization") || "";

  if (!auth.startsWith("Bearer ")) {
    throw new Error(
      "Sesión de administrador no encontrada."
    );
  }

  const idToken = auth
    .substring("Bearer ".length)
    .trim();

  if (!idToken) {
    throw new Error(
      "Token de administrador vacío."
    );
  }

  const firebaseKey = env.FIREBASE_API_KEY;

  if (!firebaseKey) {
    throw new Error(
      "Falta FIREBASE_API_KEY en Cloudflare."
    );
  }

  const url =
    `https://identitytoolkit.googleapis.com/` +
    `v1/accounts:lookup?key=${firebaseKey}`;

  const r = await fetch(url, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      idToken: idToken,
    }),
  });

  if (!r.ok) {
    throw new Error(
      "La sesión del administrador es inválida o venció."
    );
  }

  const data = await r.json();

  if (!data.users || !data.users.length) {
    throw new Error(
      "Usuario administrador no autorizado."
    );
  }

  return data.users[0];
}

/* =========================================================
   UTILIDADES
========================================================= */

function normalizarId(valor) {
  return String(valor ?? "").trim();
}

function ordenarNoticias(noticias) {
  return [...noticias].sort((a, b) => {
    const fechaA = new Date(
      a.created_at ||
      a.updated_at ||
      0
    ).getTime();

    const fechaB = new Date(
      b.created_at ||
      b.updated_at ||
      0
    ).getTime();

    return fechaB - fechaA;
  });
}

/* =========================================================
   GET
   CARGAR TODAS LAS NOTICIAS
========================================================= */

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    // El usuario debe estar autenticado.
    await validarUsuario(request, env);

    // Para LEER no usamos GITHUB_TOKEN.
    const noticias =
      await obtenerNoticiasPublicas();

    return respuesta({
      ok: true,
      total: noticias.length,
      noticias: ordenarNoticias(noticias),
    });

  } catch (error) {

    console.error(
      "ERROR GET ADMIN:",
      error
    );

    return respuesta(
      {
        ok: false,
        error:
          error?.message ||
          String(error),
      },
      500
    );
  }
}

/* =========================================================
   POST
   CREAR NOTICIA MANUAL
========================================================= */

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    await validarUsuario(request, env);

    const token = env.GITHUB_TOKEN;

    if (!token) {
      throw new Error(
        "Falta GITHUB_TOKEN en Cloudflare."
      );
    }

    const datos = await request.json();

    const noticias =
      await obtenerNoticiasPublicas();

    const sha =
      await obtenerSha(token);

    const id =
      datos.id ||
      Number(
        `${Date.now()}${Math.floor(
          Math.random() * 1000
        )}`
      );

    const nuevaNoticia = {
      ...datos,

      id: id,

      created_at:
        datos.created_at ||
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),
    };

    noticias.unshift(
      nuevaNoticia
    );

    await guardarArchivo(
      token,
      noticias,
      sha,
      `Publicar noticia: ${
        nuevaNoticia.titulo || id
      }`
    );

    return respuesta({
      ok: true,
      noticia: nuevaNoticia,
      total: noticias.length,
    });

  } catch (error) {

    console.error(
      "ERROR POST ADMIN:",
      error
    );

    return respuesta(
      {
        ok: false,
        error:
          error?.message ||
          String(error),
      },
      500
    );
  }
}

/* =========================================================
   PUT
   EDITAR NOTICIA
========================================================= */

export async function onRequestPut(context) {
  try {
    const { request, env } = context;

    await validarUsuario(request, env);

    const token = env.GITHUB_TOKEN;

    if (!token) {
      throw new Error(
        "Falta GITHUB_TOKEN en Cloudflare."
      );
    }

    const datos =
      await request.json();

    if (!datos.id) {
      return respuesta(
        {
          ok: false,
          error:
            "Falta el ID de la noticia.",
        },
        400
      );
    }

    const noticias =
      await obtenerNoticiasPublicas();

    const sha =
      await obtenerSha(token);

    const idBuscado =
      normalizarId(datos.id);

    const indice =
      noticias.findIndex(
        (noticia) =>
          normalizarId(noticia.id) ===
          idBuscado
      );

    if (indice === -1) {
      return respuesta(
        {
          ok: false,
          error:
            "La noticia no existe.",
        },
        404
      );
    }

    const anterior =
      noticias[indice];

    noticias[indice] = {
      ...anterior,
      ...datos,

      // Nunca cambiar ID.
      id: anterior.id,

      created_at:
        anterior.created_at ||
        datos.created_at ||
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),
    };

    await guardarArchivo(
      token,
      noticias,
      sha,
      `Actualizar noticia: ${
        noticias[indice].titulo ||
        datos.id
      }`
    );

    return respuesta({
      ok: true,
      noticia: noticias[indice],
    });

  } catch (error) {

    console.error(
      "ERROR PUT ADMIN:",
      error
    );

    return respuesta(
      {
        ok: false,
        error:
          error?.message ||
          String(error),
      },
      500
    );
  }
}

/* =========================================================
   DELETE
   BORRAR NOTICIA DEFINITIVAMENTE
========================================================= */

export async function onRequestDelete(context) {
  try {
    const { request, env } = context;

    await validarUsuario(request, env);

    const token = env.GITHUB_TOKEN;

    if (!token) {
      throw new Error(
        "Falta GITHUB_TOKEN en Cloudflare."
      );
    }

    let id =
      new URL(request.url)
        .searchParams
        .get("id");

    /*
      Permitimos también recibir:
      { id: ... }
      por JSON.
    */

    if (!id) {
      try {
        const body =
          await request.json();

        id = body?.id;
      } catch (_) {}
    }

    if (!id) {
      return respuesta(
        {
          ok: false,
          error:
            "Falta el ID de la noticia.",
        },
        400
      );
    }

    const noticias =
      await obtenerNoticiasPublicas();

    const sha =
      await obtenerSha(token);

    const idBuscado =
      normalizarId(id);

    const noticia =
      noticias.find(
        (n) =>
          normalizarId(n.id) ===
          idBuscado
      );

    if (!noticia) {
      return respuesta(
        {
          ok: false,
          error:
            "La noticia no existe.",
        },
        404
      );
    }

    const nuevasNoticias =
      noticias.filter(
        (n) =>
          normalizarId(n.id) !==
          idBuscado
      );

    await guardarArchivo(
      token,
      nuevasNoticias,
      sha,
      `Eliminar noticia: ${
        noticia.titulo || id
      }`
    );

    return respuesta({
      ok: true,
      eliminado: id,
      titulo:
        noticia.titulo || "",
      total:
        nuevasNoticias.length,
    });

  } catch (error) {

    console.error(
      "ERROR DELETE ADMIN:",
      error
    );

    return respuesta(
      {
        ok: false,
        error:
          error?.message ||
          String(error),
      },
      500
    );
  }
}