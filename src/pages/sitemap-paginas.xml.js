
import {
  SITE, entrada, documento, respuesta
} from '../lib/sitemaps-local.js';

export const prerender = true;

export function GET() {
  const paginas = [
    '', 'quienes-somos', 'contacto',
    'politica-de-privacidad', 'terminos-y-condiciones',
    'resultados-loterias', 'deportes-en-vivo'
  ];

  return respuesta(documento(
    paginas.map(p =>
      entrada(SITE + '/' + (p ? p + '/' : ''))
    ).join('')
  ));
}
