---
title: Triage of a compromised Windows host, from memory to timeline
kind: DFIR · Digital forensics playbook
summary: How I acquire and analyse memory and disk evidence from a suspected compromised Windows machine with FTK Imager, KAPE, Volatility 3 and DeepBlueCLI, and turn scattered artefacts into one incident timeline.
order: 3
featured: true
icon: forensics
context: Lab methodology, built from BTL1 labs and my own forensic images
tools: [FTK Imager, KAPE, Volatility 3, Autopsy, DeepBlueCLI, EZ Tools]
mitre:
  - { id: T1078, name: Valid Accounts, tactic: Initial Access }
  - { id: T1021.001, name: Remote Desktop Protocol, tactic: Lateral Movement }
  - { id: T1055, name: Process Injection, tactic: Defense Evasion }
  - { id: T1543.003, name: Windows Service, tactic: Persistence }
  - { id: T1053.005, name: Scheduled Task, tactic: Persistence }
  - { id: T1070.001, name: Clear Windows Event Logs, tactic: Defense Evasion }
---

## Objective

When the SIEM says a host is compromised, someone has to prove **how the attacker got in, what they ran, how they stayed, and what they touched**, with evidence that would survive scrutiny. This playbook is the order I work in so volatile evidence isn't lost and every conclusion traces back to an artefact.

## Environment

| Stage | Tools |
| --- | --- |
| Acquisition | FTK Imager (memory and E01 disk images), KAPE (targeted triage collection) |
| Memory analysis | Volatility 3 |
| Disk and artefacts | Autopsy, Eric Zimmerman's tools (PECmd, AmcacheParser, AppCompatCacheParser, EvtxECmd), Timeline Explorer |
| Event log triage | DeepBlueCLI |

## Methodology

### 1. Acquire in order of volatility

1. **Memory first.** RAM holds running processes, network connections and injected code that disappear at shutdown (FTK Imager → *Capture Memory*).
2. **Triage collection with KAPE** (for example the `KapeTriage` target): event logs, registry hives, Prefetch, Amcache, browser history and $MFT in minutes.
3. **Full disk image** (E01) when the case needs it.
4. **Hash everything** (MD5 and SHA-1 from FTK Imager) and record it in the chain-of-custody notes.

### 2. Memory analysis with Volatility 3

```bash
vol -f mem.raw windows.info         # confirm the OS profile and capture time
vol -f mem.raw windows.pstree       # parent/child relationships
vol -f mem.raw windows.cmdline      # full command lines per process
vol -f mem.raw windows.netscan      # connections and listening ports
vol -f mem.raw windows.malfind      # memory regions that look like injected code
vol -f mem.raw windows.dlllist --pid <PID>
```

Things that stand out: `svchost.exe` not running under `services.exe`, processes running from `AppData` or `Temp`, `powershell.exe` with encoded arguments, connections from processes that shouldn't talk to the internet, and `malfind` hits with executable memory and an `MZ` header.

### 3. Event log triage

Run DeepBlueCLI over the key logs for a fast first pass:

```powershell
.\DeepBlue.ps1 .\Security.evtx
.\DeepBlue.ps1 .\System.evtx
```

Then confirm by hand with the event IDs that matter most:

| Event ID | Log | Meaning |
| --- | --- | --- |
| 4624 / 4625 | Security | Successful / failed logon (type 3 network, type 10 RDP) |
| 4688 | Security | Process created (with command line if auditing is on) |
| 4720 / 4732 | Security | User created / added to a privileged group |
| 4698 | Security | Scheduled task created |
| 7045 | System | New service installed |
| 1102 | Security | Audit log cleared |

### 4. Execution and persistence artefacts

- **Prefetch** (PECmd): what ran, how many times, and when
- **Amcache** and **ShimCache** (AmcacheParser, AppCompatCacheParser): evidence a binary existed or ran, with SHA-1 hashes from Amcache
- **Registry**: Run/RunOnce keys, services, UserAssist for GUI execution
- **Scheduled tasks** in `C:\Windows\System32\Tasks`

### 5. Build one timeline

Parse everything with the EZ Tools into CSV, load it into Timeline Explorer (or build a timeline in Autopsy) and line up the events: first suspicious logon → tool execution → persistence → lateral movement → log clearing. Every row points back to the artefact it came from.

## Evidence

- Acquisition log with hashes for every image
- Volatility output for the suspicious processes (pstree, cmdline, netscan, malfind)
- Filtered event log extracts for the logons, services and tasks involved
- The final timeline in CSV, plus a one-page narrative

## What the findings usually look like

| Artefact | Typical attacker trace |
| --- | --- |
| 4624 type 10 from an unusual IP, after many 4625s | Brute-forced or stolen credentials used over RDP (T1078, T1021.001) |
| 7045 with a random service name and a binary in `Temp` | Persistence or remote execution via a service (T1543.003) |
| 4698 shortly after the first logon | Scheduled-task persistence (T1053.005) |
| `malfind` hit inside a legitimate process | Process injection (T1055) |
| 1102 near the end of the activity | Attacker clearing their tracks (T1070.001) |

## MITRE ATT&CK mapping

A typical hands-on-keyboard intrusion on a single host chains valid accounts (**T1078**) over RDP (**T1021.001**), persistence through services (**T1543.003**) or scheduled tasks (**T1053.005**), code injection (**T1055**) and log clearing (**T1070.001**). All are covered by the artefacts above.

## Conclusion and recommendations

- **Contain:** isolate the host, reset the compromised accounts and any credentials cached on the machine.
- **Eradicate:** remove services, tasks and Run keys found in the timeline, then re-image.
- **Recover and monitor:** watch for the same IOCs and logon patterns across the estate.
- **Prevent:** MFA and network-level restrictions on RDP, account lockout, central log forwarding (so clearing local logs doesn't erase the evidence) and command-line auditing for 4688.
