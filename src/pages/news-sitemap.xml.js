const FIREBASE_PROJECT_ID =
  import.meta.env.FIREBASE_PROJECT_ID || 'republica-actual';

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

function valorFirestore(field = {}) {
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return Number(field.doubleValue);
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(valorFirestore);
  if ('mapValue' in field) return Object.fromEntries(
    Object.entries(field.mapValue.fields || {}).map(([k,v]) => [k, valorFirestore(v)])
  );
  return '';
}

function documentoFirestore(doc = {}) {
  const datos = Object.fromEntries(
    Object.entries(doc.fields || {}).map(([k,v]) => [k, valorFirestore(v)])
  );
  if (!datos.id && doc.name) datos.id = doc.name.split('/').pop();
  return datos;
}

export async function GET() {
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
    const limite = Date.now() - 48 * 60 * 60 * 1000;

    noticias = resultado
      .filter((fila) => fila.document)
      .map((fila) => documentoFirestore(fila.document))
      .filter((noticia) => {
        const fecha = Date.parse(noticia.created_at || '');
        return Number.isFinite(fecha) && fecha >= limite;
      })
      .sort((a,b) =>
        (Date.parse(b.created_at || '') || 0) -
        (Date.parse(a.created_at || '') || 0)
      );
  } catch (error) {
    console.error('Error generando News Sitemap desde Firestore:', error);
  }

  const noticiasXML = noticias
    .filter((n) => n.titulo && n.created_at && (n.slug || n.id))
    .map((n) => {
      const identificador = n.slug || n.id;
      const url = `${SITE_URL}/noticia/${identificador}/`;
      const fecha = new Date(n.created_at).toISOString();

      return `
  <url>
    <loc>${escaparXML(url)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escaparXML(PUBLICATION_NAME)}</news:name>
        <news:language>${PUBLICATION_LANGUAGE}</news:language>
      </news:publication>
      <news:publication_date>${fecha}</news:publication_date>
      <news:title>${escaparXML(n.titulo)}</news:title>
    </news:news>
  </url>`;
    })
    .join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
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