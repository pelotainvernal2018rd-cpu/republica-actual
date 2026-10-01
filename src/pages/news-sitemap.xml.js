const SUPABASE_URL =
  'https://kbghquvejqteiawdotqd.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_ld7ydSagUVERw0yphWzjvg_yeSPpKfi';

const SITE_URL = 'https://republicaactual.net';
const PUBLICATION_NAME = 'República Actual';
const PUBLICATION_LANGUAGE = 'es';

function escaparXML(valor = '') {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  let noticias = [];

  try {
    // Google News solo necesita las noticias recientes.
    // Tomamos las publicadas durante las últimas 48 horas.
    const limite = new Date(
      Date.now() - 48 * 60 * 60 * 1000
    ).toISOString();

    const endpoint =
      `${SUPABASE_URL}/rest/v1/noticias` +
      `?select=id,titulo,created_at` +
      `&publicado=eq.true` +
      `&created_at=gte.${encodeURIComponent(limite)}` +
      `&order=created_at.desc`;

    const respuesta = await fetch(endpoint, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json'
      }
    });

    if (!respuesta.ok) {
      throw new Error(
        `Supabase respondió ${respuesta.status}`
      );
    }

    noticias = await respuesta.json();

  } catch (error) {
    console.error(
      'Error generando News Sitemap:',
      error
    );
  }

  const noticiasXML = noticias
    .filter(
      (noticia) =>
        noticia.id &&
        noticia.titulo &&
        noticia.created_at
    )
    .map((noticia) => {
      const url =
        `${SITE_URL}/noticia/${noticia.id}/`;

      const fecha =
        new Date(noticia.created_at).toISOString();

      return `
  <url>
    <loc>${escaparXML(url)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escaparXML(PUBLICATION_NAME)}</news:name>
        <news:language>${PUBLICATION_LANGUAGE}</news:language>
      </news:publication>
      <news:publication_date>${fecha}</news:publication_date>
      <news:title>${escaparXML(noticia.titulo)}</news:title>
    </news:news>
  </url>`;
    })
    .join('');

  const sitemap =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${noticiasXML}
</urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
}