---
title: "Sysmon Event ID 13: catching registry persistence before it survives a reboot"
date: 2026-11-02T16:00:00Z
description: "What Sysmon Event ID 13 records, which registry keys attackers use to persist on Windows, and the Splunk searches I use to find them without drowning in noise."
tags: [sysmon, splunk, windows, detection-engineering, persistence]
---

When malware runs once, you have an incident. When it runs every time the machine starts, you have a foothold. On Windows, the registry is the most common place attackers set that up, and **Sysmon Event ID 13** is how you see it happen.

## The three registry events in Sysmon

Sysmon logs registry activity across three event IDs:

| Event ID | Name | What it records |
| --- | --- | --- |
| 12 | RegistryEvent (Object create and delete) | A key or value was created or deleted |
| 13 | RegistryEvent (Value Set) | A value was written, **including the data** |
| 14 | RegistryEvent (Key and Value Rename) | A key or value was renamed |

Event 13 is the one that matters most for persistence, because it records **what was written**, not just that something changed. The useful fields are:

- `Image`: the process that made the change
- `TargetObject`: the full registry path
- `Details`: the data written (for example a path to an executable)
- `User` and `ProcessGuid`, which let you pivot to Event ID 1 (process creation)

> Sysmon only logs what its configuration asks for. Popular community configs (SwiftOnSecurity, Olaf Hartong's sysmon-modular) already include the high-value keys below. Check yours does.

## Where attackers persist

These are the keys I look at first. Each maps to a MITRE ATT&CK technique.

| Registry location | Why attackers use it | ATT&CK |
| --- | --- | --- |
| `...\CurrentVersion\Run` and `RunOnce` (HKLM and HKCU) | Runs a program at every logon | T1547.001 |
| `HKLM\SYSTEM\CurrentControlSet\Services\<name>` | Creates or hijacks a service | T1543.003 |
| `...\Winlogon\Userinit` and `Shell` | Hijacks what runs at logon | T1547.004 |
| `...\Image File Execution Options\<exe>\Debugger` | Launches the attacker's binary instead of a legitimate one | T1546.012 |
| `HKCU\Software\Classes\CLSID\...\InprocServer32` | COM hijacking: the user's copy overrides the system one | T1546.015 |
| `...\Environment\UserInitMprLogonScript` | Logon script persistence | T1037.001 |

## Searching for it in Splunk

Field names below follow the Splunk Add-on for Sysmon. Adjust the index to match your environment.

### Run keys, with the most suspicious paths first

```spl
index=sysmon EventCode=13 TargetObject="*\\CurrentVersion\\Run*"
| eval suspicious_path=if(match(Details, "(?i)\\\\(AppData|Temp|ProgramData|Users\\\\Public)\\\\"), 1, 0)
| eval script_host=if(match(Details, "(?i)(powershell|wscript|cscript|mshta|rundll32|regsvr32)"), 1, 0)
| table _time host User Image TargetObject Details suspicious_path script_host
| sort - script_host - suspicious_path
```

Legitimate software usually installs to `Program Files`. A Run value pointing into a user's `AppData` or `Temp`, or launching `powershell.exe` or `mshta.exe` with arguments, deserves a closer look.

### Who is writing to Run keys?

This is my favourite noise filter. Installers and updaters write to Run keys all the time, but `powershell.exe`, `cmd.exe` or a document reader doing it is unusual:

```spl
index=sysmon EventCode=13 TargetObject="*\\CurrentVersion\\Run*"
| stats count dc(host) as hosts values(TargetObject) as keys by Image
| sort hosts
```

Rare writers (one or two hosts) float to the top. Anything you recognise as legitimate goes into an allowlist lookup.

### Image File Execution Options debugger hijacks

```spl
index=sysmon EventCode=13 TargetObject="*\\Image File Execution Options\\*\\Debugger"
| table _time host User Image TargetObject Details
```

A classic trick sets a debugger on `sethc.exe` (Sticky Keys) or `utilman.exe` so that pressing Shift five times at the login screen opens a SYSTEM command prompt.

### Pivot to the process that did it

Once you have a hit, use `ProcessGuid` to get the full process creation event and its parent:

```spl
index=sysmon EventCode=1 ProcessGuid="{<guid-from-event-13>}"
| table _time host User ParentImage ParentCommandLine Image CommandLine Hashes
```

## Triage questions

For each hit, I want answers to:

1. **What process wrote it, and what started that process?** (Event 1, parent chain)
2. **What does the value point to?** Does the file exist? Is it signed? What's its hash on VirusTotal?
3. **Is it on other hosts?** Search the same `Details` value across the estate.
4. **When did it first appear?** Line it up with logons, downloads or email activity.

## Reducing false positives without losing coverage

- Allowlist by **writer and value together** (for example `OneDrive.exe` writing its own path), never by key alone. Allowlisting the whole Run key would blind you.
- Keep the allowlist in a **lookup**, with an owner and a review date, so it doesn't grow forever.
- Alert in real time on high-signal combinations (a script host writing to Run, any IFEO Debugger value) and send the rest to a daily hunting report.

## Key takeaways

- Event ID 13 shows **what** was written, **where** and **by which process**. That's everything you need to judge persistence.
- Focus on Run keys, services, Winlogon, IFEO and COM hijacks first.
- Judge by the **writer** and the **target path**, not just the key.
- Always pivot to Event ID 1 to understand the full chain.
