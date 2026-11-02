---
title: "Automating IOC enrichment with Python and the VirusTotal API"
date: 2026-11-02T13:00:00Z
description: "A small, production-minded Python script that takes a list of hashes, domains and IPs, looks them up in VirusTotal, respects rate limits and writes a CSV you can attach to a ticket."
tags: [python, automation, threat-intelligence, virustotal, soc]
---

Every phishing ticket and malware alert comes with indicators: file hashes, domains, IP addresses. Looking them up one by one in a browser is slow and error-prone. A short script does it in seconds and produces the same output every time.

This post builds a small enrichment tool around the **VirusTotal API v3**. The same structure works for AbuseIPDB, URLhaus or your own threat-intel platform.

## What it does

1. Reads indicators from a text file, one per line.
2. Works out whether each one is a **hash**, **IP** or **domain**.
3. Queries the matching VirusTotal endpoint.
4. Respects the free-tier rate limit (4 requests per minute).
5. Writes a CSV: indicator, type, malicious/suspicious counts, reputation and a link.

## Before you start

- A VirusTotal account and API key (free tier is fine for learning; check the terms before using it in a commercial SOC).
- Python 3.10+ and the `requests` library: `pip install requests`
- **Keep the key out of the code.** Set it as an environment variable:

```bash
export VT_API_KEY="your-key-here"
```

## The script

```python
#!/usr/bin/env python3
"""enrich.py: look up IOCs in VirusTotal and write a CSV report."""
import csv
import ipaddress
import os
import re
import sys
import time

import requests

API = "https://www.virustotal.com/api/v3"
KEY = os.environ.get("VT_API_KEY")
DELAY = 15  # seconds between requests: free tier allows 4 per minute

HASH_RE = re.compile(r"^[A-Fa-f0-9]{32}$|^[A-Fa-f0-9]{40}$|^[A-Fa-f0-9]{64}$")
DOMAIN_RE = re.compile(r"^(?=.{1,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$", re.I)


def refang(value: str) -> str:
    """Turn hxxp://evil[.]com back into http://evil.com before lookup."""
    return value.strip().replace("[.]", ".").replace("hxxp", "http")


def classify(ioc: str) -> str | None:
    if HASH_RE.match(ioc):
        return "file"
    try:
        ipaddress.ip_address(ioc)
        return "ip"
    except ValueError:
        pass
    host = re.sub(r"^https?://", "", ioc).split("/")[0]
    return "domain" if DOMAIN_RE.match(host) else None


def lookup(session: requests.Session, ioc: str, kind: str) -> dict:
    path = {"file": "files", "ip": "ip_addresses", "domain": "domains"}[kind]
    if kind == "domain":
        ioc = re.sub(r"^https?://", "", ioc).split("/")[0]
    r = session.get(f"{API}/{path}/{ioc}", timeout=20)
    if r.status_code == 404:
        return {"status": "not found"}
    r.raise_for_status()
    attrs = r.json()["data"]["attributes"]
    stats = attrs.get("last_analysis_stats", {})
    return {
        "status": "ok",
        "malicious": stats.get("malicious", 0),
        "suspicious": stats.get("suspicious", 0),
        "harmless": stats.get("harmless", 0),
        "reputation": attrs.get("reputation", ""),
    }


def main(infile: str, outfile: str) -> None:
    if not KEY:
        sys.exit("Set the VT_API_KEY environment variable first.")
    session = requests.Session()
    session.headers.update({"x-apikey": KEY, "accept": "application/json"})

    with open(infile) as f:
        iocs = [refang(line) for line in f if line.strip() and not line.startswith("#")]

    iocs = list(dict.fromkeys(iocs))  # de-duplicate, keep order
    rows = []
    for i, ioc in enumerate(iocs):
        kind = classify(ioc)
        if not kind:
            rows.append({"indicator": ioc, "type": "unknown", "status": "skipped"})
            continue
        if i:
            time.sleep(DELAY)
        try:
            result = lookup(session, ioc, kind)
        except requests.RequestException as e:
            result = {"status": f"error: {e}"}
        gui = {"file": "file", "ip": "ip-address", "domain": "domain"}[kind]
        rows.append({"indicator": ioc, "type": kind, **result,
                     "link": f"https://www.virustotal.com/gui/{gui}/{ioc}"})
        print(f"[{i + 1}/{len(iocs)}] {kind:6} {ioc} -> {result.get('malicious', '-')} malicious")

    fields = ["indicator", "type", "status", "malicious", "suspicious", "harmless", "reputation", "link"]
    with open(outfile, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} rows to {outfile}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: enrich.py iocs.txt report.csv")
    main(sys.argv[1], sys.argv[2])
```

## Running it

```bash
python3 enrich.py iocs.txt report.csv
```

Example `iocs.txt` (defanged indicators are fine; the script refangs them):

```text
# from ticket INC-1234
44d88612fea8a8f36de82e1278abb02f
hxxps://login-micros0ft-support[.]com/verify
203.0.113.45
```

> The first hash is the MD5 of the harmless **EICAR** antivirus test file, so it's safe to test with. `203.0.113.0/24` is a documentation-only range and will come back with no detections.

## Design choices worth copying

- **Secrets in environment variables**, never in the script or in git.
- **De-duplication** before lookups: the same domain often appears ten times in one email.
- **Refanging** so analysts can paste indicators straight from tickets.
- **Rate limiting built in.** Hitting the API too fast gets you `429` errors and lost results.
- **Errors don't stop the run.** One bad lookup is recorded in the CSV and the script carries on.
- **A link per row**, so whoever reads the report can verify the result.

## Where to take it next

- Add more sources (AbuseIPDB for IPs, URLhaus for URLs, WHOIS for domain age) and combine them into one score.
- Cache results locally for 24 hours so repeated indicators don't use up your quota.
- Output a Markdown table you can paste straight into a ticket.
- Wrap it in a SOAR playbook or a Splunk custom command so it runs automatically on new alerts.

A note on judgement: a detection count is a signal, not a verdict. Zero detections doesn't mean safe (new infrastructure often starts clean), and one engine flagging a popular domain is often a false positive. The script saves you time; the analyst still makes the call.
