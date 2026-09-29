const SUPABASE_URL =
  'https://kbghquvejqteiawdotqd.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_ld7ydSagUVERw0yphWzjvg_yeSPpKfi';


export async function GET() {

  const urlsFijas = [
    'https://republicaactual.net/',
    'https://republicaactual.net/categoria/nacionales/',
    'https://republicaactual.net/categoria/politica/',
    'https://republicaactual.net/categoria/economia/',
    'https://republicaactual.net/categoria/deportes/',
    'https://republicaactual.net/categoria/entretenimiento/',
    'https://republicaactual.net/categoria/mundo/',
    'https://republicaactual.net/categoria/tecnologia/',
    'https://republicaactual.net/quienes-somos/',
    'https://republicaactual.net/contacto/',
    'https://republicaactual.net/politica-de-privacidad/',
    'https://republicaactual.net/terminos-y-condiciones/'
  ];


  let noticias = [];

  try {

    const endpoint =
      `${SUPABASE_URL}/rest/v1/noticias?select=id,created_at&publicado=eq.true&order=created_at.desc`;

    const respuesta =
      await fetch(endpoint, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Accept: 'application/json'
        }
      });


    if (respuesta.ok) {
      noticias = await respuesta.json();
    }

  } catch (error) {

    console.error(
      'Error generando sitemap:',
      error
    );

  }


  const paginasXML =
    urlsFijas
      .map((url) => `
  <url>
    <loc>${url}</loc>
  </url>`)
      .join('');


  const noticiasXML =
    noticias
      .map((noticia) => {

        const url =
          `https://republicaactual.net/noticia/${noticia.id}/`;

        const fecha =
          noticia.created_at
            ? new Date(noticia.created_at)
                .toISOString()
            : null;

        return `
  <url>
    <loc>${url}</loc>
    ${
      fecha
        ? `<lastmod>${fecha}</lastmod>`
        : ''
    }
  </url>`;

      })
      .join('');


  const sitemap =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paginasXML}
${noticiasXML}
</urlset>`;


  return new Response(
    sitemap,
    {
      headers: {
        'Content-Type':
          'application/xml; charset=utf-8'
      }
    }
  );
}