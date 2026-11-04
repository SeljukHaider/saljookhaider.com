// Post-build: writes dist/_headers with security headers and a strict CSP.
// Inline scripts are allowed by SHA-256 hash only (no 'unsafe-inline'), so
// the hashes are recomputed from the built HTML on every build.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const htmlFiles = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? htmlFiles(p) : p.endsWith('.html') ? [p] : [];
  });

const hashes = new Set();
const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
for (const file of htmlFiles(dist)) {
  for (const [, attrs, body] of readFileSync(file, 'utf8').matchAll(re)) {
    if (/type=["']?application\/(ld\+)?json/i.test(attrs)) continue; // data blocks, never executed
    hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
  }
}

const csp = [
  "default-src 'self'",
  // Cloudflare Web Analytics (cookieless): beacon script + reporting endpoint.
  `script-src 'self' https://static.cloudflareinsights.com ${[...hashes].sort().join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const headers = `/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin

/_astro/*
  Cache-Control: public, max-age=31536000, immutable
`;

writeFileSync(join(dist, '_headers'), headers);
console.log(`_headers written: ${hashes.size} inline script hash(es)`);
