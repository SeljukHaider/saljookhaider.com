---
title: saljookhaider.com, a portfolio built like a security project
kind: Web · Side project
summary: This site. Static Astro build on Cloudflare Workers with a strict Content-Security-Policy, HSTS and no third-party scripts, plus a working terminal, a blog and RSS.
order: 6
icon: web
context: Personal project
tools: [Astro, TypeScript, Cloudflare Workers, CSP]
live: https://saljookhaider.com
---

## Approach

I built my own site the way I'd want any web property to be built: with the smallest attack surface possible.

- **Static output only.** No server, database or CMS backend to patch or breach.
- **Strict Content-Security-Policy.** Scripts are allowed by SHA-256 hash and nothing loads from third-party origins. The hashes are recalculated on every build.
- **Security headers:** HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, a tight `Referrer-Policy` and `Permissions-Policy`.
- **`security.txt`** published at `/.well-known/security.txt` (RFC 9116).
- **No tracking:** no analytics or cookies.

## Features

A bento-grid layout with light and dark themes, an interactive terminal (try `help`, or `nmap`), case-study pages, a Markdown blog with RSS, and automatic deployment on every push to GitHub.
