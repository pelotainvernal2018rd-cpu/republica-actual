
import {
  noticias, esUtil, enlace, fecha,
  entrada, documento, respuesta
} from '../lib/sitemaps-local.js';

export const prerender = true;

export function GET() {
  const xml = documento(
    noticias.filter(n => !esUtil(n))
      .map(n =>
        entrada(enlace(n), fecha(n.updated_at || n.created_at))
      ).join('')
  );

  return respuesta(xml);
}
