---
title: Phishing email analysis playbook
kind: Email · Threat analysis playbook
summary: The checklist I follow for a reported email, covering headers, authentication results, links and attachments, to reach a clear benign, suspicious or malicious verdict with IOCs ready to block.
order: 4
icon: phishing
context: Lab methodology, built from BTL1 phishing analysis labs
tools: [CyberChef, VirusTotal, WHOIS, MXToolbox, Email headers]
mitre:
  - { id: T1566.001, name: Spearphishing Attachment, tactic: Initial Access }
  - { id: T1566.002, name: Spearphishing Link, tactic: Initial Access }
  - { id: T1204.002, name: Malicious File, tactic: Execution }
---

## Objective

Reach a defensible verdict on a reported email (**benign, suspicious or malicious**) and, if it's malicious, produce the indicators needed to block it and find every other recipient.

## Methodology

### 1. Headers

- Read the `Received:` chain bottom-up to find the real sending server and IP.
- Compare `From`, `Reply-To` and `Return-Path`. A reply address on a different domain is a classic sign.
- Check `Authentication-Results` for **SPF**, **DKIM** and **DMARC**. A failing or missing DMARC on a domain that claims to be a bank is a red flag.
- Look up the sending IP and domain with MXToolbox and WHOIS. A domain registered last week is a strong signal.

### 2. Links

- Extract every URL (CyberChef: *Extract URLs*), including ones hidden behind buttons or encoded in the HTML.
- Defang before sharing (`hxxps://example[.]com`).
- Check reputation in VirusTotal and look for lookalike domains and URL shorteners or redirect chains.

### 3. Attachments

- Hash the file (SHA-256) and check it in VirusTotal **before** opening anything.
- Treat Office files with macros, ISO/IMG, HTML and archive attachments as high risk.
- Decode embedded content with CyberChef (*From Base64*, *URL Decode*) to see what it actually does.

### 4. Verdict and response

- **Malicious:** block the sender, domain, URLs and hashes, purge the message from every mailbox, and check whether anyone clicked or opened it.
- **Suspicious:** escalate with the evidence collected so far.
- **Benign:** close with a short note so the reporter gets feedback.

## Evidence

A short report per email: header analysis, authentication results, every URL and attachment with reputation results, the verdict, and the IOC list.

## MITRE ATT&CK mapping

Malicious attachments map to **T1566.001**, malicious links to **T1566.002**, and a user opening the payload to **T1204.002**.
