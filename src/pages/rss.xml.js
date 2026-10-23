
import rss from '@astrojs/rss';
import noticiasData from '../data/noticias.json';

const SITE = 'https://republicaactual.net';

export async function GET(context) {
  const noticias = Array.isArray(noticiasData)
    ? noticiasData
    : Object.values(noticiasData).flatMap((valor) =>
        Array.isArray(valor) ? valor : []
      );

  const recientes = noticias
    .filter((n) => n && n.titulo && n.slug)
    .sort((a, b) => {
      const fechaA = Date.parse(a.created_at || '') || 0;
      const fechaB = Date.parse(b.created_at || '') || 0;
      return fechaB - fechaA;
    })
    .slice(0, 30);

  return rss({
    title: 'República Actual - Últimas Noticias',
    description:
      'Noticias de República Dominicana y el mundo. Actualidad, política, economía, deportes y más.',
    site: SITE,
    items: recientes.map((noticia) => {
      const contenido = noticia.contenido || '';

      const descripcion = contenido
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);

      const fecha = new Date(noticia.created_at || Date.now());

      const imagen = noticia.imagen
        ? new URL(noticia.imagen, SITE).href
        : null;

      return {
        title: noticia.titulo,
        link: `/noticia/${encodeURIComponent(noticia.slug)}/`,
        pubDate: Number.isNaN(fecha.getTime())
          ? new Date()
          : fecha,
        description: descripcion,
        customData: imagen
          ? `<enclosure url="${imagen.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}" type="image/jpeg" />`
          : '',
      };
    }),
    customData: '<language>es-do</language>',
  });
}
