import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// Case studies / projects. One Markdown file per project in src/content/projects.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    kind: z.string(), // e.g. "SIEM · Detection playbook"
    summary: z.string(), // one or two sentences for cards and meta description
    order: z.number().default(99),
    featured: z.boolean().default(false),
    icon: z.enum(['siem', 'network', 'forensics', 'phishing', 'code', 'web']).default('siem'),
    context: z.string().optional(), // honesty label, e.g. "Lab methodology"
    tools: z.array(z.string()).default([]),
    mitre: z
      .array(z.object({ id: z.string(), name: z.string(), tactic: z.string() }))
      .default([]),
    repo: z.string().optional(),
    live: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, projects };
