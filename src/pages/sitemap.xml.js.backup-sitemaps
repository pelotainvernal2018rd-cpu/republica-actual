import { cargarNoticiasPublicadas } from '../lib/noticias-firestore.js';

const SITE = 'https://republicaactual.net';

function escaparXML(valor = '') {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fechaValida(fecha) {
  if (!fecha) return null;

  const d = new Date(fecha);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  return d.toISOString();
}

export async function GET() {
  const urlsFijas = [
    '/',
    '/categoria/nacionales/',
    '/categoria/politica/',
    '/categoria/economia/',
    '/categoria/deportes/',
    '/categoria/entretenimiento/',
    '/categoria/mundo/',
    '/categoria/tecnologia/',
    '/quienes-somos/',
    '/contacto/',
    '/politica-de-privacidad/',
    '/terminos-y-condiciones/'
  ];

  try {
    const noticias =
      await cargarNoticiasPublicadas();

    const urlsNoticias =
      noticias
        .filter(
          (noticia) =>
            noticia.slug ||
            noticia.id
        )
        .map((noticia) => {
          const ruta =
            `/noticia/${noticia.slug || noticia.id}/`;

          return {
            loc: `${SITE}${ruta}`,

            lastmod:
              fechaValida(
                noticia.updated_at ||
                noticia.modified_at ||
                noticia.created_at
              )
          };
        });

    const xmlFijas =
      urlsFijas
        .map((ruta) => {
          return `
  <url>
    <loc>${escaparXML(`${SITE}${ruta}`)}</loc>
  </url>`;
        })
        .join('');

    const xmlNoticias =
      urlsNoticias
        .map((item) => {
          return `
  <url>
    <loc>${escaparXML(item.loc)}</loc>${
      item.lastmod
        ? `
    <lastmod>${escaparXML(item.lastmod)}</lastmod>`
        : ''
    }
  </url>`;
        })
        .join('');

    const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xmlFijas}${xmlNoticias}
</urlset>`;

    return new Response(xml, {
      status: 200,

      headers: {
        'Content-Type':
          'application/xml; charset=utf-8'
      }
    });

  } catch (error) {
    console.error(
      'Error generando sitemap:',
      error
    );

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
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