const GITHUB_OWNER = "pelotainvernal2018rd-cpu";
const GITHUB_REPO = "republica-actual";
const GITHUB_BRANCH = "main";
const ARCHIVO_NOTICIAS = "src/data/noticias.json";

function respuesta(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function headersGithub(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function obtenerArchivo(token) {
  const apiUrl =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
    `/contents/${ARCHIVO_NOTICIAS}?ref=${GITHUB_BRANCH}`;

  const meta = await fetch(apiUrl, {
    headers: headersGithub(token),
  });

  if (!meta.ok) {
    throw new Error(
      `GitHub no pudo localizar noticias.json. HTTP ${meta.status}`
    );
  }

  const info = await meta.json();

  const rawUrl =
    `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}` +
    `/${GITHUB_BRANCH}/${ARCHIVO_NOTICIAS}?t=${Date.now()}`;

  const raw = await fetch(rawUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.raw+json",
    },
  });

  if (!raw.ok) {
    throw new Error(
      `No se pudo descargar noticias.json. HTTP ${raw.status}`
    );
  }

  const texto = await raw.text();

  let noticias;

  try {
    noticias = JSON.parse(texto);
  } catch {
    throw new Error("noticias.json contiene JSON inválido.");
  }

  if (!Array.isArray(noticias)) {
    throw new Error("El archivo noticias.json no contiene una lista.");
  }

  return {
    noticias,
    sha: info.sha,
  };
}

async function guardarArchivo(token, noticias, sha, mensaje) {
  const apiUrl =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
    `/contents/${ARCHIVO_NOTICIAS}`;

  const contenido = JSON.stringify(noticias, null, 2);

  // Codificación UTF-8 segura para Base64
  const bytes = new TextEncoder().encode(contenido);

  let binario = "";

  for (let i = 0; i < bytes.length; i += 8192) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }

  const base64 = btoa(binario);

  const r = await fetch(apiUrl, {
    method: "PUT",

    headers: headersGithub(token),

    body: JSON.stringify({
      message: mensaje,
      content: base64,
      sha,
      branch: GITHUB_BRANCH,
    }),
  });

  if (!r.ok) {
    const detalle = await r.text();

    throw new Error(
      `GitHub rechazó la actualización. HTTP ${r.status}: ${detalle}`
    );
  }

  return r.json();
}

async function validarUsuario(request, env) {
  const auth = request.headers.get("Authorization") || "";

  if (!auth.startsWith("Bearer ")) {
    throw new Error("Sesión de administrador no encontrada.");
  }

  const idToken = auth.slice(7).trim();

  if (!idToken) {
    throw new Error("Token de administrador vacío.");
  }

  /*
    Validamos el token usando Firebase Authentication.

    FIREBASE_API_KEY puede configurarse en Cloudflare.
    Si ya tienes la clave en otra variable puedes cambiar
    únicamente el nombre de esta variable.
  */

  const firebaseKey = env.FIREBASE_API_KEY;

  if (!firebaseKey) {
    throw new Error(
      "Falta FIREBASE_API_KEY en las variables de Cloudflare."
    );
  }

  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idToken,
      }),
    }
  );

  if (!r.ok) {
    throw new Error("Sesión de administrador inválida o vencida.");
  }

  const data = await r.json();

  if (!data.users || !data.users.length) {
    throw new Error("Usuario no autorizado.");
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

/* ==========================================================
   GET
   CARGAR TODAS LAS NOTICIAS
========================================================== */

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    await validarUsuario(request, env);

    const token = env.GITHUB_TOKEN;

    if (!token) {
      return respuesta(
        {
          ok: false,
          error:
            "Falta GITHUB_TOKEN en las variables de Cloudflare.",
        },
        500
      );
    }

    const { noticias } = await obtenerArchivo(token);

    return respuesta({
      ok: true,
      total: noticias.length,
      noticias: ordenarNoticias(noticias),
    });
  } catch (error) {
    return respuesta(
      {
        ok: false,
        error: error.message || String(error),
      },
      500
    );
  }
}

/* ==========================================================
   POST
   CREAR UNA NOTICIA
========================================================== */

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    await validarUsuario(request, env);

    const token = env.GITHUB_TOKEN;

    if (!token) {
      throw new Error(
        "Falta GITHUB_TOKEN en las variables de Cloudflare."
      );
    }

    const datos = await request.json();

    const { noticias, sha } = await obtenerArchivo(token);

    const id =
      datos.id ||
      Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);

    const nueva = {
      ...datos,
      id,
      created_at:
        datos.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    noticias.unshift(nueva);

    await guardarArchivo(
      token,
      noticias,
      sha,
      `Publicar noticia: ${nueva.titulo || id}`
    );

    return respuesta({
      ok: true,
      noticia: nueva,
    });
  } catch (error) {
    return respuesta(
      {
        ok: false,
        error: error.message || String(error),
      },
      500
    );
  }
}

/* ==========================================================
   PUT
   EDITAR UNA NOTICIA
========================================================== */

export async function onRequestPut(context) {
  try {
    const { request, env } = context;

    await validarUsuario(request, env);

    const token = env.GITHUB_TOKEN;

    if (!token) {
      throw new Error(
        "Falta GITHUB_TOKEN en las variables de Cloudflare."
      );
    }

    const datos = await request.json();

    if (!datos.id) {
      return respuesta(
        {
          ok: false,
          error: "Falta el ID de la noticia.",
        },
        400
      );
    }

    const { noticias, sha } = await obtenerArchivo(token);

    const idBuscado = normalizarId(datos.id);

    const indice = noticias.findIndex(
      (n) => normalizarId(n.id) === idBuscado
    );

    if (indice === -1) {
      return respuesta(
        {
          ok: false,
          error: "La noticia no existe.",
        },
        404
      );
    }

    const anterior = noticias[indice];

    noticias[indice] = {
      ...anterior,
      ...datos,

      id: anterior.id,

      created_at:
        anterior.created_at ||
        datos.created_at ||
        new Date().toISOString(),

      updated_at: new Date().toISOString(),
    };

    await guardarArchivo(
      token,
      noticias,
      sha,
      `Actualizar noticia: ${
        noticias[indice].titulo || datos.id
      }`
    );

    return respuesta({
      ok: true,
      noticia: noticias[indice],
    });
  } catch (error) {
    return respuesta(
      {
        ok: false,
        error: error.message || String(error),
      },
      500
    );
  }
}

/* ==========================================================
   DELETE
   BORRAR DEFINITIVAMENTE UNA NOTICIA
========================================================== */

export async function onRequestDelete(context) {
  try {
    const { request, env } = context;

    await validarUsuario(request, env);

    const token = env.GITHUB_TOKEN;

    if (!token) {
      throw new Error(
        "Falta GITHUB_TOKEN en las variables de Cloudflare."
      );
    }

    let id = new URL(request.url).searchParams.get("id");

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return respuesta(
        {
          ok: false,
          error: "Falta el ID de la noticia.",
        },
        400
      );
    }

    const { noticias, sha } = await obtenerArchivo(token);

    const idBuscado = normalizarId(id);

    const noticia = noticias.find(
      (n) => normalizarId(n.id) === idBuscado
    );

    if (!noticia) {
      return respuesta(
        {
          ok: false,
          error: "La noticia no existe.",
        },
        404
      );
    }

    const nuevasNoticias = noticias.filter(
      (n) => normalizarId(n.id) !== idBuscado
    );

    await guardarArchivo(
      token,
      nuevasNoticias,
      sha,
      `Eliminar noticia: ${noticia.titulo || id}`
    );

    return respuesta({
      ok: true,
      eliminado: id,
      total: nuevasNoticias.length,
    });
  } catch (error) {
    return respuesta(
      {
        ok: false,
        error: error.message || String(error),
      },
      500
    );
  }
}