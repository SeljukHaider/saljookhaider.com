import { getCollection } from 'astro:content';

// Hand-rolled sitemap: small site, no extra dependency.
export async function GET(context) {
  const site = context.site;
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const day = (d) => d.toISOString().slice(0, 10);
  const latest = posts.reduce((m, p) => (p.data.date > m ? p.data.date : m), new Date(0));
  const urls = [
    { loc: '/', lastmod: day(latest) },
    { loc: '/projects/' },
    { loc: '/blog/', lastmod: day(latest) },
    ...posts.map((p) => ({ loc: `/blog/${p.id}/`, lastmod: day(p.data.date) })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${new URL(u.loc, site)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
