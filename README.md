# saljookhaider.com

Bento-grid portfolio with an interactive terminal and a Markdown blog. Astro, static output, deployed on Cloudflare Pages.
The design was inspired by [astro-bento-portfolio](https://github.com/Ladvace/astro-bento-portfolio) (MIT), but this site is built from scratch.

## Run locally
```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to dist/
```

## Where things live
| What | Where |
|---|---|
| All content: summary, experience, certs, skills, education, projects, links, "Now" | `src/data/profile.json` |
| Blog posts (one file each) | `src/content/blog/YYYY-MM-DD-slug.md` |
| Home page bento grid | `src/pages/index.astro` |
| Projects page | `src/pages/projects/index.astro` |
| Terminal (self-contained) | `src/components/Terminal.astro` |
| Colours (dark/light + 5 accents) | `src/styles/global.css` |
| CV | `public/Saljook_Haider_CV.pdf` (path set in profile.json → `cv`) |
| Photo | drop in `public/`, set `"photo": "/me.jpg"` in profile.json (replaces the SH shield) |
| security.txt | `public/.well-known/security.txt` (renew `Expires` yearly) |

### New blog post
```md
---
title: Something I did today
date: 2026-11-03
description: Optional one-liner
tags: [writeup]
draft: false
---
Write here.
```

### New terminal command
Add an entry to `commands` in `Terminal.astro`. Give it a `desc` to list it in `help`, or leave `desc` out to make it a hidden easter egg.

## Deploy (Cloudflare Pages)
Workers & Pages → Create → Pages → Connect to Git → this repo. Preset **Astro**, build `npm run build`, output `dist`.
Then Custom domains → add `saljookhaider.com` and `www.saljookhaider.com`.
