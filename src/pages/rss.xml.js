import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import profile from '../data/profile.json';

export async function GET(context) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return rss({
    title: `${profile.name} · Blog`,
    description: `${profile.role} · ${profile.headline}`,
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.description,
      link: `/blog/${p.id}/`,
    })),
  });
}
