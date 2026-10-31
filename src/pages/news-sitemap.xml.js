
import {
  noticias,
  esUtil,
  enlace,
  fechaPublicacion,
  escapar,
  documento,
  respuesta
} from '../lib/sitemaps-local.js';

export const prerender = true;

export function GET() {
  const ahora = Date.now();
  const limite = 48 * 60 * 60 * 1000;

  const recientes = noticias.filter(n => {
    const d = fechaPublicacion(n);

    if (!d || !n.titulo || esUtil(n)) {
      return false;
    }

    const diferencia = ahora - d.getTime();

    return diferencia >= 0 && diferencia <= limite;
  });

  const contenido = recientes.map(n => {
    const d = fechaPublicacion(n);

    return (
      '<url>' +
      '<loc>' + escapar(enlace(n)) + '</loc>' +
      '<news:news>' +
      '<news:publication>' +
      '<news:name>República Actual</news:name>' +
      '<news:language>es</news:language>' +
      '</news:publication>' +
      '<news:publication_date>' +
      d.toISOString() +
      '</news:publication_date>' +
      '<news:title>' +
      escapar(n.titulo) +
      '</news:title>' +
      '</news:news>' +
      '</url>'
    );
  }).join('');

  return respuesta(
    documento(
      contenido,
      ' xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"'
    )
  );
}
