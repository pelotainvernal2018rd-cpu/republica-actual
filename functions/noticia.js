
/**
 * REPÚBLICA ACTUAL
 * CORRECCIÓN SEO — ENLACES ANTIGUOS
 *
 * Archivo: functions/noticia.js
 *
 * Recupera:
 * /noticia?id=123
 *
 * Redirige a:
 * /noticia/slug-de-la-noticia/
 *
 * Solo redirige cuando la noticia existe
 * y su página de destino está publicada.
 */

const SUPABASE_URL =
  'https://kbghquvejqteiawdotqd.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_ld7ydSagUVERw0yphWzjvg_yeSPpKfi';

const SITE_ORIGIN =
  'https://republicaactual.net';


/* ============================================
   RESPUESTA 404 REAL
============================================ */

function notFound() {

  return new Response(
    'Noticia no encontrada',
    {
      status: 404,

      headers: {
        'Content-Type':
          'text/plain; charset=utf-8',

        'X-Robots-Tag':
          'noindex, follow',

        'Cache-Control':
          'public, max-age=300'
      }
    }
  );
}


/* ============================================
   PROCESAR ENLACES ANTIGUOS
============================================ */

export async function onRequestGet({
  request,
  env
}) {

  const url =
    new URL(request.url);

  const id =
    (
      url.searchParams.get('id') || ''
    ).trim();


  /* VALIDAR IDENTIFICADOR */

  if (
    !/^\d{1,15}$/.test(id)
  ) {

    return notFound();

  }


  try {

    /* CONSULTAR SUPABASE */

    const query =
      new URL(
        `${SUPABASE_URL}/rest/v1/noticias`
      );

    query.searchParams.set(
      'id',
      `eq.${id}`
    );

    query.searchParams.set(
      'select',
      'id,slug'
    );

    query.searchParams.set(
      'limit',
      '1'
    );


    const result =
      await fetch(
        query.toString(),
        {
          headers: {
            apikey: SUPABASE_KEY,

            Authorization:
              `Bearer ${SUPABASE_KEY}`,

            Accept:
              'application/json'
          },

          signal:
            AbortSignal.timeout(6000)
        }
      );


    if (!result.ok) {

      throw new Error(
        `Supabase ${result.status}`
      );

    }


    const rows =
      await result.json();


    const row =
      Array.isArray(rows)
        ? rows[0]
        : null;


    /* NOTICIA INEXISTENTE */

    if (!row) {

      return notFound();

    }


    /* OBTENER SLUG */

    const slug =
      String(
        row.slug || ''
      ).trim();


    if (
      !slug ||
      !/^[a-zA-Z0-9_-]+$/.test(slug)
    ) {

      return notFound();

    }


    /* CONSTRUIR URL DEFINITIVA */

    const destination =
      `${SITE_ORIGIN}/noticia/${encodeURIComponent(slug)}/`;


    /* VERIFICAR QUE LA PÁGINA EXISTE */

    const destinationRequest =
      new Request(
        destination,
        {
          method: 'GET'
        }
      );


    const target =
      await env.ASSETS.fetch(
        destinationRequest
      );


    const contentType =
      target.headers.get(
        'content-type'
      ) || '';


    if (
      target.status !== 200 ||
      !contentType.includes('text/html')
    ) {

      return notFound();

    }


    /* REDIRECCIÓN PERMANENTE 301 */

    return new Response(
      null,
      {
        status: 301,

        headers: {
          Location:
            destination,

          'Cache-Control':
            'public, max-age=3600',

          'X-Robots-Tag':
            'noindex, follow'
        }
      }
    );

  } catch (error) {

    console.error(
      'Error recuperando noticia antigua:',
      error
    );


    return new Response(
      'No se pudo comprobar la noticia antigua',
      {
        status: 503,

        headers: {
          'Content-Type':
            'text/plain; charset=utf-8',

          'Cache-Control':
            'no-store',

          'Retry-After':
            '300'
        }
      }
    );

  }

}
