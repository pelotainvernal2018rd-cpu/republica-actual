
import datos from '../data/noticias.json';

export const SITE = 'https://republicaactual.net';

export const escapar = (valor = '') =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const fecha = valor => {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const noticias = (
  Array.isArray(datos) ? datos : []
).filter(n => n && n.publicado !== false && (n.slug || n.id));

export const esUtil = n =>
  n.republica_util === true ||
  String(n.categoria || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') === 'republica util';

export const enlace = n => {
  const definitiva = String(n.url_definitiva || '').trim();

  if (definitiva) {
    try {
      const u = new URL(definitiva, SITE);
      if (
        u.origin === SITE &&
        u.pathname.startsWith('/noticia/')
      ) return u.href;
    } catch {}
  }

  return SITE + '/noticia/' +
    encodeURIComponent(String(n.slug || n.id)) + '/';
};

export const entrada = (loc, mod = null, extra = '') =>
  '<url><loc>' + escapar(loc) + '</loc>' +
  (mod ? '<lastmod>' + mod.toISOString() + '</lastmod>' : '') +
  extra + '</url>';

export const documento = (contenido, namespaces = '') =>
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' +
  namespaces + '>' + contenido + '</urlset>';

export const respuesta = xml =>
  new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
