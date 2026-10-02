import { cargarNoticiasPublicadas } from '../lib/noticias-firestore.js';

const SITE =
  'https://republicaactual.net';

const PUBLICACION =
  'República Actual';

const IDIOMA =
  'es';

function escaparXML(valor = '') {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fechaValida(fecha) {
  if (!fecha) {
    return null;
  }

  const d =
    new Date(fecha);

  if (
    Number.isNaN(
      d.getTime()
    )
  ) {
    return null;
  }

  return d;
}

export async function GET() {
  try {
    const todas =
      await cargarNoticiasPublicadas();

    const ahora =
      Date.now();

    const hace48Horas =
      ahora -
      (
        48 *
        60 *
        60 *
        1000
      );

    const noticias =
      todas
        .filter((noticia) => {
          const fecha =
            fechaValida(
              noticia.created_at
            );

          if (!fecha) {
            return false;
          }

          return (
            fecha.getTime() >=
            hace48Horas
          );

        })
        .sort(
          (a, b) =>
            (
              Date.parse(
                b.created_at || ''
              ) || 0
            )
            -
            (
              Date.parse(
                a.created_at || ''
              ) || 0
            )
        );

    const urls =
      noticias
        .filter(
          (noticia) =>
            noticia.titulo &&
            (
              noticia.slug ||
              noticia.id
            )
        )
        .map((noticia) => {
          const fecha =
            fechaValida(
              noticia.created_at
            );

          const slug =
            noticia.slug ||
            noticia.id;

          return `
  <url>
    <loc>${escaparXML(
      `${SITE}/noticia/${slug}/`
    )}</loc>

    <news:news>
      <news:publication>
        <news:name>${escaparXML(
          PUBLICACION
        )}</news:name>

        <news:language>${IDIOMA}</news:language>
      </news:publication>

      <news:publication_date>${escaparXML(
        fecha.toISOString()
      )}</news:publication_date>

      <news:title>${escaparXML(
        noticia.titulo
      )}</news:title>
    </news:news>
  </url>`;
        })
        .join('');

    const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
>${urls}
</urlset>`;

    return new Response(
      xml,
      {
        status: 200,

        headers: {
          'Content-Type':
            'application/xml; charset=utf-8'
        }
      }
    );

  } catch (error) {
    console.error(
      'Error generando Google News sitemap:',
      error
    );

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
</urlset>`,
      {
        status: 500,

        headers: {
          'Content-Type':
            'application/xml; charset=utf-8'
        }
      }
    );
  }
}