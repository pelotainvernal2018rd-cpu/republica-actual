
import { SITE, respuesta } from '../lib/sitemaps-local.js';

export const prerender = true;

export function GET() {
  const archivos = [
    'sitemap-noticias.xml',
    'news-sitemap.xml',
    'sitemap-categorias.xml',
    'sitemap-paginas.xml',
    'sitemap-republica-util.xml',
    'sitemap-imagenes.xml'
  ];

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    archivos.map(nombre =>
      '<sitemap><loc>' + SITE + '/' + nombre +
      '</loc></sitemap>'
    ).join('') +
    '</sitemapindex>';

  return respuesta(xml);
}
