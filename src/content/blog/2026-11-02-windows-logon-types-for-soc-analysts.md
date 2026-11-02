---
title: "Windows logon types every SOC analyst should know (Event IDs 4624 and 4625)"
date: 2026-11-02T12:00:00Z
description: "A field guide to Windows logon types 2 to 11: what each one means, which ones point to RDP, lateral movement or brute force, and Splunk searches to hunt with them."
tags: [windows, event-logs, splunk, authentication, soc]
---

Event ID **4624** (successful logon) and **4625** (failed logon) are some of the most common events in any Windows SIEM. On their own they're noise. The **Logon Type** field turns them into a story: *how* did this account log on, and from where?

## The logon types

| Type | Name | What it means | Typical source |
| --- | --- | --- | --- |
| **2** | Interactive | Someone typed credentials at the keyboard (or a KVM/console) | Physical access, console sessions |
| **3** | Network | Access to a resource over the network: file shares, remote admin tools | SMB, PsExec, WMI, many lateral-movement tools |
| **4** | Batch | A scheduled task ran under this account | Task Scheduler |
| **5** | Service | A service started under this account | Service Control Manager |
| **7** | Unlock | A locked workstation was unlocked | Users returning to their desk |
| **8** | NetworkCleartext | Network logon with the password sent in cleartext | Basic auth on IIS, some scripts |
| **9** | NewCredentials | `runas /netonly`: different credentials used for network access only | Admins, and attackers using pass-the-hash tooling |
| **10** | RemoteInteractive | Remote Desktop (RDP) | Remote Desktop, Remote Assistance |
| **11** | CachedInteractive | Logon with cached domain credentials (no domain controller available) | Laptops off the network |

## The fields that matter

Beyond `Logon_Type`, I always pull these from 4624/4625:

- `Account_Name` and `Account_Domain`: who
- `Workstation_Name` and `Source_Network_Address`: from where
- `Logon_Process` and `Authentication_Package`: **NTLM** vs **Kerberos** matters
- `Logon_ID`: links the logon to later activity (like 4688 process creation) in the same session
- For 4625, `Status` and `Sub_Status` explain *why* it failed

Field names here follow the Splunk Add-on for Microsoft Windows; yours may differ slightly.

## What to hunt for

### 1. RDP from unexpected places (type 10)

```spl
index=wineventlog EventCode=4624 Logon_Type=10
| stats count values(Source_Network_Address) as sources dc(host) as hosts by Account_Name
| sort - hosts
```

Questions to ask: should this account use RDP at all? Is the source IP internal? A public IP here means RDP is exposed to the internet, which is a finding in itself (ATT&CK T1021.001).

### 2. Brute force and password spraying (4625)

**Brute force** is many failures against *one* account. **Spraying** is a few failures each against *many* accounts from one source:

```spl
index=wineventlog EventCode=4625
| bin _time span=10m
| stats count dc(Account_Name) as accounts values(Account_Name) as tried by _time Source_Network_Address
| where count > 20 OR accounts > 10
```

Then check for a **4624 from the same source right after the failures**. That's the moment an attempt succeeded.

Common `Sub_Status` codes on 4625:

| Code | Meaning |
| --- | --- |
| `0xC000006A` | Wrong password (the username exists) |
| `0xC0000064` | Username doesn't exist |
| `0xC0000234` | Account locked out |
| `0xC0000072` | Account disabled |
| `0xC000006F` | Logon outside allowed hours |

A burst of `0xC0000064` means someone is guessing usernames. A burst of `0xC000006A` means they already know valid ones.

### 3. Lateral movement (type 3 with admin tools)

A single account making network logons to many hosts in a short time is a classic lateral-movement pattern:

```spl
index=wineventlog EventCode=4624 Logon_Type=3 NOT Account_Name="*$"
| bin _time span=15m
| stats dc(host) as targets values(host) as hosts by _time Account_Name Source_Network_Address
| where targets >= 5
```

The `NOT Account_Name="*$"` filter removes computer accounts, which make network logons constantly.

### 4. Pass-the-hash indicators

Pass-the-hash attacks often show up as a **type 9** logon with logon process `seclogo`, or as **type 3 NTLM** logons for accounts that normally use Kerberos. Neither is proof on its own, but both are worth a closer look, especially from workstations to servers.

```spl
index=wineventlog EventCode=4624 Logon_Type=9 Logon_Process=seclogo
| table _time host Account_Name Source_Network_Address
```

### 5. New service accounts or scheduled tasks (types 4 and 5)

Type 4 and 5 logons are normally predictable. A *new* account showing up with type 5 often lines up with **Event 7045** (a new service was installed): a common persistence and remote-execution technique.

## Putting it together

When an alert fires, I build a mini-timeline for the account:

1. **4625** bursts: were there failed attempts first?
2. **4624**: first successful logon. Which type, from where?
3. **4672**: were special (admin) privileges assigned to that logon?
4. **4688**: what ran in that session? Join on `Logon_ID`.
5. **4624 type 3** to other hosts: did it spread?

That sequence answers most "is this account compromised?" questions in a few minutes.

## Cheat sheet

- **Type 2:** someone at the keyboard
- **Type 3:** network access. Watch for one account hitting many hosts
- **Type 10:** RDP. Should it be allowed, and from where?
- **4625 + Sub_Status:** tells you guessing vs spraying vs lockouts
- **Logon_ID:** the glue between a logon and everything that happened next
