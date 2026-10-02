const FIREBASE_PROJECT_ID =
  import.meta.env.FIREBASE_PROJECT_ID || 'republica-actual';

function valorFirestore(field = {}) {
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return Number(field.doubleValue);
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(valorFirestore);
  if ('mapValue' in field) {
    return Object.fromEntries(
      Object.entries(field.mapValue.fields || {}).map(([k, v]) => [k, valorFirestore(v)])
    );
  }
  return '';
}

function documentoFirestore(doc = {}) {
  const datos = Object.fromEntries(
    Object.entries(doc.fields || {}).map(([k, v]) => [k, valorFirestore(v)])
  );
  if (!datos.id && doc.name) datos.id = doc.name.split('/').pop();
  return datos;
}

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
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;

    const respuesta = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'noticias' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'publicado' },
              op: 'EQUAL',
              value: { booleanValue: true }
            }
          }
        }
      })
    });

    if (!respuesta.ok) {
      throw new Error(`Firestore respondió ${respuesta.status}: ${await respuesta.text()}`);
    }

    const resultado = await respuesta.json();

    noticias = resultado
      .filter((fila) => fila.document)
      .map((fila) => documentoFirestore(fila.document))
      .sort(
        (a, b) =>
          (Date.parse(b.created_at || '') || 0) -
          (Date.parse(a.created_at || '') || 0)
      );
  } catch (error) {
    console.error('Error generando sitemap desde Firestore:', error);
  }

  const paginasXML = urlsFijas
    .map((url) => `
  <url>
    <loc>${url}</loc>
  </url>`)
    .join('');

  const noticiasXML = noticias
    .map((noticia) => {
      const identificador = noticia.slug || noticia.id;
      if (!identificador) return '';

      const url =
        `https://republicaactual.net/noticia/${identificador}/`;

      const fecha = noticia.created_at
        ? new Date(noticia.created_at).toISOString()
        : null;

      return `
  <url>
    <loc>${url}</loc>
    ${fecha ? `<lastmod>${fecha}</lastmod>` : ''}
  </url>`;
    })
    .join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paginasXML}
${noticiasXML}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
}