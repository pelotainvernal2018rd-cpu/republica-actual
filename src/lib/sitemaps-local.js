
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
  if (valor === null || valor === undefined || valor === '') return null;

  let d;

  if (
    typeof valor === 'number' ||
    /^\d{10,13}$/.test(String(valor))
  ) {
    const numero = Number(valor);
    d = new Date(numero < 1e12 ? numero * 1000 : numero);
  } else {
    d = new Date(valor);
  }

  return Number.isNaN(d.getTime()) ? null : d;
};

export const fechaPublicacion = n =>
  fecha(
    n.fecha_publicacion ||
    n.created_at ||
    n.fecha ||
    n.published_at ||
    n.date
  );

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
  const identificador = String(n.slug || n.id);
  const ruta = '/noticia/' + encodeURIComponent(identificador) + '/';

  return SITE + ruta;
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
