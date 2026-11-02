---
title: "Mapping an incident to MITRE ATT&CK: a practical guide for SOC analysts"
date: 2026-11-02T14:00:00Z
description: "How to turn raw investigation notes into an accurate MITRE ATT&CK mapping, with a worked example from phishing email to ransomware staging, common mistakes, and how to use the result for detection gaps."
tags: [mitre-attack, incident-response, threat-intelligence, soc, reporting]
---

"Map it to ATT&CK" appears in almost every SOC job description and incident-report template. Done well, it turns a messy investigation into a shared language that the detection team, threat intel and management all understand. Done badly, it's a list of technique IDs pasted at the bottom of a ticket.

Here's how I approach it.

## A 60-second refresher

[MITRE ATT&CK](https://attack.mitre.org/) is a knowledge base of real attacker behaviour, organised as:

- **Tactics:** the attacker's *goal* at each stage (Initial Access, Execution, Persistence, Privilege Escalation, Defense Evasion, Credential Access, Discovery, Lateral Movement, Collection, Command and Control, Exfiltration, Impact).
- **Techniques and sub-techniques:** *how* they achieve it, for example **T1059.001** (Command and Scripting Interpreter: PowerShell).
- **Procedures:** the specific way a particular group or tool does it.

There are separate matrices for Enterprise (Windows, Linux, macOS, cloud), Mobile and ICS (industrial control systems).

## The method

### 1. Start from evidence, not from the matrix

Write the investigation as a timeline of **observed actions**, each backed by a log line or artefact. Only then look for the technique that describes each action. Working the other way round ("what techniques might apply?") is how mappings fill up with guesses.

### 2. Describe the behaviour in plain words first

"`winword.exe` spawned `powershell.exe` with an encoded command" is behaviour. "Malicious macro" is a conclusion. The behaviour is what you map.

### 3. Pick the most specific technique you can justify

Use the sub-technique when the evidence supports it (**T1566.001** Spearphishing Attachment rather than just **T1566** Phishing). If the evidence doesn't tell you which sub-technique, stay at the parent level. Don't guess.

### 4. Note confidence

Mark each mapping as **confirmed** (direct evidence) or **suspected** (inferred). It's honest, and it tells the reader where the gaps in your evidence are.

### 5. Use the mapping to ask "what did we miss?"

Once the known steps are mapped, look at the tactics *between* them. If you have Initial Access and Exfiltration but nothing for Discovery or Lateral Movement, either the attacker didn't need them or you haven't found them yet. That second possibility drives the next hunt.

## Worked example

Here's a typical intrusion reconstructed from logs:

| Time | Observed evidence | Tactic | Technique | Confidence |
| --- | --- | --- | --- | --- |
| 09:02 | User opens `invoice.docm` from an external email | Initial Access | **T1566.001** Spearphishing Attachment | Confirmed (email logs) |
| 09:03 | `winword.exe` → `powershell.exe -enc ...` (Sysmon 1) | Execution | **T1059.001** PowerShell | Confirmed |
| 09:03 | Command line is Base64-encoded | Defense Evasion | **T1027** Obfuscated Files or Information | Confirmed |
| 09:03 | PowerShell downloads `update.exe` from a new domain (Sysmon 3, 11) | Command and Control | **T1105** Ingress Tool Transfer | Confirmed |
| 09:05 | `update.exe` written to HKCU Run key (Sysmon 13) | Persistence | **T1547.001** Registry Run Keys | Confirmed |
| 09:20 | `whoami /groups`, `net group "domain admins" /domain` | Discovery | **T1033** System Owner/User Discovery, **T1069.002** Domain Groups | Confirmed |
| 10:40 | LSASS memory accessed by unknown process (Sysmon 10) | Credential Access | **T1003.001** LSASS Memory | Suspected (no dump file recovered) |
| 11:15 | Type 3 logons with an admin account to 6 servers (4624) | Lateral Movement | **T1021.002** SMB/Windows Admin Shares | Confirmed |
| 11:30 | `vssadmin delete shadows /all /quiet` | Impact | **T1490** Inhibit System Recovery | Confirmed |

Reading down the table tells the whole story in one view, and the "Suspected" row shows exactly where more evidence is needed.

## Common mistakes

- **Mapping the tool instead of the behaviour.** "Mimikatz" isn't a technique. What it *did* (T1003.001) is.
- **Over-mapping.** One action, one or two techniques. Ten IDs for a single PowerShell command makes the report harder to use, not more thorough.
- **Confusing tactics.** Scheduled tasks can be Execution, Persistence *and* Privilege Escalation. Pick the tactic that matches the attacker's purpose *in this case*.
- **Forgetting the matrix version.** ATT&CK is updated about twice a year and techniques get renamed or merged. Note the version you used in the report.

## Turning the mapping into better detection

The real value comes after the incident:

1. **Coverage check:** for each mapped technique, do we have a detection rule? Did it fire? How quickly?
2. **Gap list:** techniques with no detection become backlog items for detection engineering.
3. **Visualise it:** the free [ATT&CK Navigator](https://mitre-attack.github.io/attack-navigator/) lets you colour techniques by "detected", "missed" or "not applicable" and export the layer for the report.
4. **Threat intel:** compare the mapping with known groups' techniques on the ATT&CK site. It's not attribution, but it can suggest what the attacker is likely to do next.

## Checklist

- [ ] Timeline built from evidence first
- [ ] Each step described as behaviour
- [ ] Most specific justified technique chosen
- [ ] Confidence marked for each mapping
- [ ] Gaps between tactics reviewed
- [ ] Detection coverage checked for every technique
- [ ] ATT&CK version noted
