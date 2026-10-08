
import {
  noticias, esUtil, enlace, fecha,
  entrada, documento, respuesta
} from '../lib/sitemaps-local.js';

export const prerender = true;

export function GET() {
  return respuesta(documento(
    noticias.filter(esUtil)
      .map(n =>
        entrada(enlace(n), fecha(n.updated_at || n.created_at))
      ).join('')
  ));
}
