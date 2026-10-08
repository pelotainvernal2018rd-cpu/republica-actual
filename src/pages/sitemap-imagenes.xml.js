
import {
  noticias, enlace, escapar,
  documento, respuesta
} from '../lib/sitemaps-local.js';

export const prerender = true;

export function GET() {
  const contenido = noticias
    .filter(n =>
      typeof n.imagen === 'string' &&
      /^https?:\/\//.test(n.imagen)
    )
    .map(n =>
      '<url><loc>' + escapar(enlace(n)) + '</loc>' +
      '<image:image><image:loc>' +
      escapar(n.imagen) +
      '</image:loc></image:image></url>'
    ).join('');

  return respuesta(documento(
    contenido,
    ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
  ));
}
