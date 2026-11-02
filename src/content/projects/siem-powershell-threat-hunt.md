---
title: Hunting malicious PowerShell with Splunk and Sysmon
kind: SIEM · Threat detection playbook
summary: How I detect, triage and scope suspicious PowerShell activity in Splunk, from an encoded command line to persistence and outbound connections, with the SPL I use at each step and the ATT&CK techniques it maps to.
order: 1
featured: true
icon: siem
context: Lab methodology, built from BTL1 labs and my own simulated environment
tools: [Splunk, Sysmon, Windows Event Logs, PowerShell logging, CyberChef, VirusTotal]
mitre:
  - { id: T1566.001, name: Spearphishing Attachment, tactic: Initial Access }
  - { id: T1059.001, name: PowerShell, tactic: Execution }
  - { id: T1027, name: Obfuscated Files or Information, tactic: Defense Evasion }
  - { id: T1547.001, name: Registry Run Keys / Startup Folder, tactic: Persistence }
  - { id: T1105, name: Ingress Tool Transfer, tactic: Command and Control }
---

## Objective

PowerShell is one of the most abused tools on Windows: it ships with every host, runs in memory and can download and execute payloads in one line. This playbook answers three questions an analyst has to answer quickly when a PowerShell alert fires:

1. **Is it malicious?** Separate admin scripts from attacker activity.
2. **What did it do?** Decode the payload, find child processes, files, registry changes and network connections.
3. **How far did it spread?** Scope across hosts and users, then hand over a clear escalation.

## Environment

| Layer | What I use |
| --- | --- |
| SIEM | Splunk Enterprise with the Splunk Add-on for Sysmon and the Windows add-on |
| Endpoint telemetry | Sysmon (SwiftOnSecurity-style config): Event IDs 1, 3, 11, 13 |
| Windows logging | Security 4688 with command-line auditing, 4624/4625 logons |
| PowerShell logging | Microsoft-Windows-PowerShell/Operational 4104 (script block logging) |
| Enrichment | CyberChef, VirusTotal, WHOIS |

> Index, sourcetype and field names below follow the standard Splunk add-ons. Adjust them to your environment.

## Methodology

### 1. Find suspicious command lines

Start broad: PowerShell launched with flags attackers rely on (encoded commands, hidden windows, download cradles, execution-policy bypass).

```spl
index=sysmon EventCode=1 (Image="*\\powershell.exe" OR Image="*\\pwsh.exe")
  (CommandLine="*-enc*" OR CommandLine="*-EncodedCommand*" OR CommandLine="*-w hidden*"
   OR CommandLine="*IEX*" OR CommandLine="*DownloadString*" OR CommandLine="*-ExecutionPolicy Bypass*")
| table _time host User ParentImage CommandLine
| sort - _time
```

### 2. Check the parent process

The parent tells the story. PowerShell spawned by Word, Excel, Outlook, `wscript.exe` or `mshta.exe` almost always means a malicious document or script, not an administrator.

```spl
index=sysmon EventCode=1 Image="*\\powershell.exe"
  ParentImage IN ("*\\winword.exe","*\\excel.exe","*\\outlook.exe","*\\wscript.exe","*\\mshta.exe")
| stats count min(_time) as first_seen max(_time) as last_seen by host User ParentImage CommandLine
| convert ctime(first_seen) ctime(last_seen)
```

### 3. Decode the payload

`-EncodedCommand` takes Base64 of **UTF-16LE** text. In CyberChef: *From Base64* then *Decode text (UTF-16LE 1200)*. If script block logging is on, Event 4104 already holds the decoded script, including anything deobfuscated at runtime:

```spl
index=wineventlog source="XmlWinEventLog:Microsoft-Windows-PowerShell/Operational" EventCode=4104
  (ScriptBlockText="*FromBase64String*" OR ScriptBlockText="*Net.WebClient*" OR ScriptBlockText="*Invoke-Expression*")
| table _time host ScriptBlockText
```

### 4. Follow what it did next

Pivot on the host and time window from step 1 and look for the usual follow-on activity.

**Outbound connections made by PowerShell** (Sysmon 3):

```spl
index=sysmon EventCode=3 Image="*\\powershell.exe"
| stats count values(DestinationIp) as dest_ip values(DestinationPort) as dest_port by host
```

**Files dropped**, executables and scripts (Sysmon 11):

```spl
index=sysmon EventCode=11 Image="*\\powershell.exe"
  (TargetFilename="*.exe" OR TargetFilename="*.dll" OR TargetFilename="*.ps1")
| table _time host TargetFilename
```

**Persistence through Run keys** (Sysmon 13):

```spl
index=sysmon EventCode=13 TargetObject="*\\CurrentVersion\\Run*"
| table _time host Image TargetObject Details
```

### 5. Scope across the estate

Take every indicator found so far (domains, IPs, file hashes, the decoded command) and search for it on every host, not just the one that alerted.

```spl
index=sysmon (EventCode=3 DestinationIp="<ioc_ip>") OR (EventCode=22 QueryName="*<ioc_domain>*")
| stats count by host Image
```

## Evidence

For each alert I keep the same evidence set, so the escalation can be read without access to Splunk:

- The original alert and the exact SPL that confirmed it
- Process tree: parent → PowerShell → children, with full command lines
- The decoded payload (CyberChef recipe saved alongside)
- Network destinations with VirusTotal and WHOIS results (domain age is a strong signal)
- Files written and registry keys changed, with hashes
- List of affected hosts and users from the scoping search

## What the findings usually look like

| Signal | Benign (typical) | Malicious (typical) |
| --- | --- | --- |
| Parent process | `explorer.exe`, SCCM/Intune agent, known admin tooling | Office apps, `wscript.exe`, `mshta.exe`, `rundll32.exe` |
| Command line | Signed scripts from a known share | `-enc`, `-w hidden`, `IEX (New-Object Net.WebClient)` |
| Network | Internal management servers | New domains, raw IPs, unusual ports |
| Follow-on | None | Dropped executables, Run-key persistence, discovery commands |

## MITRE ATT&CK mapping

The techniques this playbook covers are listed alongside this page. The usual chain is: phishing attachment (**T1566.001**) → PowerShell execution (**T1059.001**) → encoded payload (**T1027**) → download of a second stage (**T1105**) → Run-key persistence (**T1547.001**).

## Conclusion and recommendations

- **Contain:** isolate the host, disable or reset the affected account, block confirmed domains and IPs.
- **Eradicate:** remove persistence, delete dropped files, re-image if the payload ran with admin rights.
- **Improve detection:** turn on script block logging everywhere, alert on Office applications spawning PowerShell, and allowlist known admin scripts by signer and parent process to cut false positives without losing coverage.
- **Harden:** Constrained Language Mode or AppLocker/WDAC for standard users, and block macros from the internet.
