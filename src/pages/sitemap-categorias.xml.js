
import {
  SITE, entrada, documento, respuesta
} from '../lib/sitemaps-local.js';

export const prerender = true;

export function GET() {
  const categorias = [
    'nacionales', 'politica', 'economia',
    'deportes', 'entretenimiento', 'mundo', 'tecnologia'
  ];

  return respuesta(documento(
    categorias.map(c =>
      entrada(SITE + '/categoria/' + c + '/')
    ).join('')
  ));
}
