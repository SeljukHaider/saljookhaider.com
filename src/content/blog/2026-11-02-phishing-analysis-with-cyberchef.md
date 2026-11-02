---
title: "Analysing a phishing email with CyberChef: recipes that save time"
date: 2026-11-02T15:00:00Z
description: "A practical walkthrough of phishing triage with CyberChef: extracting and defanging URLs, decoding Base64 and quoted-printable bodies, unpacking encoded PowerShell, and hashing attachments safely."
tags: [phishing, cyberchef, email-security, triage, soc]
---

Reported phishing emails are one of the most common tickets in any SOC. Most are quick to close, but the dangerous ones hide their payload behind layers of encoding. **CyberChef**, the "Cyber Swiss Army Knife" from GCHQ, peels those layers back without running anything.

This post covers the recipes I reach for most, in the order I use them.

> **Safety first:** work on a copy of the raw `.eml` in an isolated analysis VM. Never click links or open attachments on your normal workstation. CyberChef runs entirely in the browser, and you can download it to use offline.

## Step 1: Get the raw message

You need the full source, not the rendered email:

- **Outlook:** open the message → *File → Properties* for headers, or save it as `.msg`/`.eml`
- **Gmail:** *⋮ → Show original*
- **Microsoft 365 admins:** download the message from the Threat Explorer or Quarantine view

## Step 2: Pull out the headers that matter

Paste the headers into CyberChef and use a **Regular expression** operation (built-in options are available, or use your own pattern) to extract:

- `From`, `Reply-To`, `Return-Path`: do the domains match?
- `Received`: read from bottom to top to find the real originating server
- `Authentication-Results`: `spf=`, `dkim=` and `dmarc=` results

A useful pattern for pulling every IPv4 address out of the `Received` chain:

```text
Recipe: Extract IP addresses (IPv4, unique, display total)
```

Look up each IP and the sending domain with WHOIS and MXToolbox. A domain registered in the last few days is a strong phishing signal.

## Step 3: Decode the body

Email bodies are often encoded. Two encodings appear constantly:

| You see | It is | CyberChef operation |
| --- | --- | --- |
| `Content-Transfer-Encoding: base64` with long blocks of letters | Base64 | **From Base64** |
| `=3D`, `=20`, lines ending in `=` | Quoted-printable | **From Quoted Printable** |

For HTML bodies, follow the decode with **Extract URLs** to list every link, including ones behind buttons whose visible text says something else.

## Step 4: Extract and defang URLs

A recipe I keep saved:

```text
From Base64  →  Extract URLs (unique)  →  Defang URL
```

**Defang URL** turns `https://evil.example/login` into `hxxps://evil[.]example/login`, so you can paste it into a ticket or chat without anyone accidentally clicking it.

Watch for:

- **Lookalike domains** (`rn` instead of `m`, extra hyphens, unusual top-level domains)
- **Open redirects** on legitimate sites that bounce to the real payload
- **URL-encoded** parameters (`%68%74%74%70`): use **URL Decode**
- Links to file-sharing or form services that host credential-harvesting pages

## Step 5: Attachments, safely

Never open the attachment. Instead:

1. Decode it from the raw email with **From Base64**, then **SHA2** (256) to get its hash. Or use **Generate all hashes**.
2. Search the hash on VirusTotal. A known-bad hash ends the investigation quickly.
3. If it's unknown, check the **file type**, not the extension: **Detect File Type** shows the real type from the magic bytes (`MZ` for Windows executables, `PK` for ZIP-based files such as `.docx`, `D0 CF 11 E0` for old Office files).
4. HTML attachments are a favourite for credential phishing. Decode them and **Extract URLs** or look for embedded Base64.

## Step 6: Decoding a PowerShell payload

Malicious documents and HTML smuggling often end in a PowerShell one-liner such as:

```text
powershell -nop -w hidden -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkA...
```

The `-enc` argument is Base64 of **UTF-16LE** text. The recipe:

```text
From Base64  →  Decode text (UTF-16LE (1200))
```

The decoded script often contains *another* layer: a `FromBase64String` call, a `[char]` array, or gzip-compressed data. Chain **From Base64 → Gunzip** or **From Charcode** as needed. CyberChef's **Magic** operation can suggest the next step when you're stuck.

## Step 7: Reach a verdict

| Verdict | Typical evidence | Action |
| --- | --- | --- |
| **Malicious** | Known-bad hash or URL, credential harvesting page, encoded payload | Block sender, domains, URLs and hashes; purge from all mailboxes; check for clicks |
| **Suspicious** | New domain, failed DMARC, unusual attachment, but no confirmed payload | Escalate with the evidence; consider blocking pending analysis |
| **Benign** | Legitimate sender, passing authentication, known links | Close, and thank the reporter |

Whatever the verdict, **reply to the person who reported it**. Users who get feedback keep reporting.

## The recipes, summarised

| Task | Recipe |
| --- | --- |
| Find every link | From Base64 → Extract URLs → Defang URL |
| Quoted-printable body | From Quoted Printable |
| Encoded PowerShell | From Base64 → Decode text (UTF-16LE) |
| Attachment hash | From Base64 → SHA2 (256) |
| Real file type | From Base64 → Detect File Type |
| Unknown encoding | Magic |

Save these as favourites in CyberChef and a typical phishing ticket becomes a five-minute job.
