---
title: "When hackers turned supermarket freezers into ovens: Europe's refrigeration attacks explained"
date: 2026-11-02T18:00:00Z
description: "Two waves of attacks heated supermarket fridges to 50°C in France, then in Belgium, Luxembourg, Sweden, Estonia and Ireland. What happened, how internet-exposed refrigeration controllers were abused, and what SOC and OT teams should do now."
tags: [ot-security, incident-analysis, critical-infrastructure, ics, news]
---

Most cyberattacks steal data or lock it up for ransom. The attacks on European supermarkets over the past three weeks did neither. Instead, attackers logged into the systems that keep food cold and told them to heat up. Hundreds of stores lost their entire fresh and frozen stock overnight, and some had fires.

It's one of the clearest examples yet of a cyberattack causing direct physical damage in everyday life. Last night, the second wave reached Ireland.

> **Status as of 2 November 2026:** investigations in France, Belgium and Sweden are ongoing. Nobody has claimed responsibility, and authorities have not confirmed how the attackers got in or whether the two waves are linked. I'll update this post as facts are confirmed.

## Timeline

### Wave 1: France, night of 11–12 October 2026

- On Sunday night, refrigeration systems at hundreds of French supermarkets were taken over remotely. Fridges and freezers were driven up to around **50°C**, according to [Reuters](https://www.timeslive.co.za/news/world/2026-10-12-hackers-heat-french-supermarket-fridges-sparking-fires-and-food-losses/) and [Al Jazeera](https://aljazeera.com/news/2026/10/13/unprecedented-cyberattack-hits-french-supermarkets-causing-food-losses).
- Affected chains included **Intermarché, Coopérative U, Carrefour, Monoprix and E.Leclerc**. France's finance minister told Parliament that roughly **700 of the country's 10,000 supermarkets** were hit ([PBS/AP](https://www.pbs.org/newshour/world/cyberattacks-disrupt-refrigeration-systems-at-european-supermarkets)).
- Stores had to throw away fresh and frozen goods worth millions of euros. The Paris prosecutor's cybercrime unit opened an investigation that also covers reports of fires ([ITPro](https://www.itpro.com/security/cyber-attacks/french-fridges-hacked-in-country-wide-supermarket-attack) reported floods from sprinkler systems as well).
- On **12 October**, CERT-FR (part of ANSSI, France's national cybersecurity agency) issued alert **CERTFR-2026-ALE-012** about numerous compromises of Danfoss **AK-SM** and **AK-SC** refrigeration controllers. On 13 October it added **Copeland xweb** and **Dixell xweb** systems, and it updated the alert again on 16 October ([SecurityWeek](https://www.securityweek.com/supermarket-refrigeration-attack-widens-to-copeland-dixell-controllers/)).

### Wave 2: Belgium, Luxembourg, Sweden, Estonia and Ireland, night of 1–2 November 2026

- Around 2 a.m. on Monday, freezers in stores across several countries warmed up again ([CNBC/Reuters](https://www.cnbc.com/2026/11/02/cyberattack-on-fridges-hits-supermarkets-across-europe.html)).
- **Belgium and Luxembourg:** about 40 Delhaize stores, 15 Carrefour Belgium stores and five Colruyt-run Spar shops reported problems ([ShiftDelete](https://shiftdelete.net/en/supermarket-cyberattack)). The CEO of the refrigeration contractor that runs Delhaize's systems said the units' evaporators had been switched into defrost mode.
- **Sweden:** ICA and Coop stores were hit, as was a home-delivery distribution centre run by Axfood near Gothenburg ([Al Jazeera](https://www.aljazeera.com/news/2026/11/2/freezers-in-sweden-belgium-overheat-following-possible-cyberattacks)).
- **Ireland:** **SuperValu** said a "cyber incident" affected one specific model of refrigeration system in **13 of its 223 stores** ([Al Jazeera](https://www.aljazeera.com/news/2026/11/2/freezers-in-sweden-belgium-overheat-following-possible-cyberattacks)).
- **Estonia:** a supermarket chain was also affected, according to a technology supplier quoted by Reuters ([ShiftDelete](https://shiftdelete.net/en/supermarket-cyberattack)).

## How the attack worked

A supermarket's cold aisles are usually run by a **supervisory controller**, a small embedded computer that manages every display case, cold room and compressor in the store. It sets temperatures, schedules defrost cycles and raises alarms. To save on site visits, many of these controllers have a **web interface** that refrigeration contractors can reach remotely, and in too many cases that interface is reachable straight from the internet.

From public reporting, the attackers didn't need to break the refrigeration hardware itself. They used the controller's **own legitimate functions**:

1. **Forced defrost.** Every refrigerated case defrosts periodically: heaters switch on briefly to melt ice off the evaporator coils. French broadcaster BFM TV reported that attackers remotely triggered forced, continuous defrosting, and Belgian contractors described the same thing in the second wave.
2. **Longer cycles to delay the alarm.** Le Monde reported that defrost cycles were stretched from about one hour to eight hours in some freezers and cold rooms, which delayed temperature alarms ([ForkLog](https://forklog.com/en/news/hackers-disrupt-refrigeration-in-hundreds-of-french-supermarkets)). This is clever and nasty: many systems deliberately ignore high temperatures *during* defrost, because a short spike is normal.
3. **Setpoint tampering.** At one Dixell-equipped store near Bordeaux, the freezer setpoint was reportedly changed from −22°C to 150°C. Staff caught it in time ([iThome, citing Le Monde](https://www.ithome.com.tw/news/179661)).
4. **Timing.** The changes were made overnight, when stores were closed and nobody was watching the cases.

### Which equipment was involved

Danfoss said most of the affected units were **legacy controllers that no longer get security updates**: the **AK-SM 800** (end of life since May 2021) and the **AK-SC 355** (phased out in 2016). Some current **AK-SM 800A** units running outdated firmware were also hit ([Hard2bit](https://hard2bit.com/en/blog/french-supermarket-cyberattack-refrigeration-danfoss/), [ITPro](https://www.itpro.com/security/cyber-attacks/french-fridges-hacked-in-country-wide-supermarket-attack)). CERT-FR's alert also lists Copeland and Dixell xweb systems.

### The warning that came first

Two months before the French attack, in August 2026, Claroty's Team82 published research called **"Freeze the Controller, Defrost the Food"** ([Claroty](https://blog.claroty.com/team82/research/freeze-the-controller-defrost-the-food-uncovering-vulnerabilities-in-danfoss-refrigeration-controllers)) and presented it at DEF CON 34. It described:

- Three vulnerabilities in the **Danfoss AK-SM 800A** web interface, including an **authentication bypass** and a path to **remote code execution** (CVE-2025-41451). Danfoss had fixed them in firmware **R4.3.1**.
- **23 vulnerabilities** (21 high severity) in **Copeland XWEB Pro**, allowing root-level code execution, fixed in firmware **1.13** ([Refindustry](https://refindustry.com/news/danfoss-copeland-and-trane-address-controller-security-vulnerabilities/)).
- About **2,765** AK-SM 800A management interfaces reachable from the internet, found with Censys.

On the day of the French attack, a researcher counted **2,752 exposed Danfoss systems, 1,590 of them in France** ([BleepingComputer](https://www.bleepingcomputer.com/news/security/cyberattack-shuts-down-refrigerators-at-french-supermarkets/)). Sekoia's threat intelligence team noted exposed systems in Spain, Portugal, Poland, Germany and Belgium too. Belgium was hit three weeks later.

**Important caveat:** neither CERT-FR nor Danfoss has said these specific vulnerabilities were used. The attackers might have exploited them, or simply logged in with default or weak passwords on end-of-life devices. Either way, the root cause is the same: **control interfaces that should never have been on the open internet.**

## What makes this attack unusual

- **No ransom and no data theft.** Retailers reported no ransom demand and no stolen data ([Hard2bit](https://hard2bit.com/en/blog/french-supermarket-cyberattack-refrigeration-danfoss/)). The goal appears to have been disruption: sabotage.
- **Scale with low effort.** Hundreds of sites in one night suggests automation: scan for exposed controllers, log in or exploit, change the same parameters everywhere.
- **Physical consequences.** Spoiled food, fires and flooding, plus a food-safety risk if warmed products had stayed on the shelves.
- **Third-party access.** Several retailers described the attack as hitting their *refrigeration supplier's* systems. The weak point was the remote-maintenance channel, not the retailer's corporate IT.

## Mapping it to MITRE ATT&CK for ICS

Initial access hasn't been confirmed, so this is my working hypothesis based on public reporting:

| Stage | Technique | Evidence so far |
| --- | --- | --- |
| Initial access | **T0883** Internet Accessible Device | Thousands of controller web interfaces exposed online |
| Initial access | **T0866** Exploitation of Remote Services *or* **T0859** Valid Accounts | Known auth-bypass flaws on old firmware, or default and weak credentials (unconfirmed) |
| Impair process control | **T0836** Modify Parameter | Defrost duration and temperature setpoints changed |
| Impair process control | **T0831** Manipulation of Control | Forced continuous defrost mode |
| Inhibit response | **T0878** Alarm Suppression | Long defrost cycles delayed high-temperature alarms |
| Impact | **T0879** Damage to Property, **T0828** Loss of Productivity and Revenue | Food destroyed, fires, stores closing aisles |

## What I'd do as a defender

### If you run or support retail, cold-storage or building systems

1. **Find your exposure today.** Inventory every refrigeration, HVAC and building-management controller. Then check from the *outside*: search Shodan or Censys for your own public IP ranges, or ask your provider. If a controller's login page answers from the internet, that's an incident waiting to happen. CERT-FR calls direct internet exposure of a management interface contrary to good practice.
2. **Take it off the internet.** Put remote maintenance behind a **VPN with MFA**, or a vendor-access gateway with per-session approval and logging. Allowlist the contractor's IP addresses as a minimum stopgap.
3. **Patch or replace.** Upgrade AK-SM 800A to **R4.3.1 or later** and XWEB Pro to **1.13 or later**. **Replace** end-of-life controllers (AK-SM 800, AK-SC 355), because they will never be fixed. CERT-FR also recommends the stricter security level on the Danfoss devices concerned.
4. **Kill default credentials** and give every contractor named accounts, not a shared login.
5. **Add an independent alarm.** A temperature probe that alerts *outside* the controller, by SMS or to a monitoring centre, still works if the controller itself is compromised. Make sure someone can act at 2 a.m.
6. **Check contracts and insurance.** CERT-FR's alert reportedly advises checking insurance terms before cutting off data feeds to maintenance providers, because the policy may require remote monitoring.

### If you work in a SOC

Most SOCs don't see OT at all. These attacks show why they should. Detection ideas that work even with modest telemetry:

- **Perimeter logs:** any inbound connection from the internet to a controller's web port (often 80/443, sometimes vendor-specific ports) is suspicious by definition. Alert on it.
- **Authentication:** logins to controller web interfaces outside maintenance windows, from new countries or ASNs, or many sites logged into within minutes of each other.
- **Process data:** if controller logs or BMS data reach the SIEM, alert on **setpoint changes**, **manual defrost commands**, and **defrost duration** changes. A 1-hour defrost becoming 8 hours is a clear anomaly.
- **Correlation:** the same parameter change on many stores in a short window is almost never maintenance.

A simple Splunk starting point, assuming firewall logs and a lookup of your OT asset IPs:

```spl
index=firewall action=allowed
    [| inputlookup ot_controllers.csv | rename ip as dest_ip | fields dest_ip]
| where NOT (cidrmatch("10.0.0.0/8", src_ip) OR cidrmatch("172.16.0.0/12", src_ip) OR cidrmatch("192.168.0.0/16", src_ip))
| stats count earliest(_time) as first latest(_time) as last values(dest_port) as ports by src_ip dest_ip
| convert ctime(first) ctime(last)
```

## The bigger lesson

None of this needed a zero-day. The equipment was old, the interfaces were public, and the warning had already been published. That's a familiar pattern in incident response: the technical fix was known; the problem was **asset visibility and ownership**. Nobody was clearly responsible for a box in the back room that a contractor installed years ago.

The fridges were the target this time. The same kind of controller runs heating, ventilation, lifts and pumps in buildings everywhere. If you can't list every internet-reachable device your organisation owns, that's the first thing to fix.

## Sources

- [AP via PBS: Cyberattacks disrupt refrigeration systems at European supermarkets](https://www.pbs.org/newshour/world/cyberattacks-disrupt-refrigeration-systems-at-european-supermarkets)
- [Al Jazeera: Hundreds of supermarkets in France hit by 'unprecedented' cyberattack](https://aljazeera.com/news/2026/10/13/unprecedented-cyberattack-hits-french-supermarkets-causing-food-losses)
- [BleepingComputer: Cyberattack shuts down refrigerators at French supermarkets](https://www.bleepingcomputer.com/news/security/cyberattack-shuts-down-refrigerators-at-french-supermarkets/)
- [SecurityWeek: Supermarket refrigeration attack widens to Copeland, Dixell controllers](https://www.securityweek.com/supermarket-refrigeration-attack-widens-to-copeland-dixell-controllers/)
- [Claroty Team82: Freeze the Controller, Defrost the Food](https://blog.claroty.com/team82/research/freeze-the-controller-defrost-the-food-uncovering-vulnerabilities-in-danfoss-refrigeration-controllers)
- [Refindustry: Danfoss, Copeland and Trane address controller security vulnerabilities](https://refindustry.com/news/danfoss-copeland-and-trane-address-controller-security-vulnerabilities/)
- [ITPro: French fridges hacked in country-wide supermarket attack](https://www.itpro.com/security/cyber-attacks/french-fridges-hacked-in-country-wide-supermarket-attack)
- [CNBC/Reuters: Cyberattack on fridges hits supermarkets across Europe](https://www.cnbc.com/2026/11/02/cyberattack-on-fridges-hits-supermarkets-across-europe.html)
- [Al Jazeera: Suspected cyberattacks trigger supermarket fridge failures across Europe](https://www.aljazeera.com/news/2026/11/2/freezers-in-sweden-belgium-overheat-following-possible-cyberattacks)
- [Hard2bit: French supermarket cyberattack and Danfoss refrigeration](https://hard2bit.com/en/blog/french-supermarket-cyberattack-refrigeration-danfoss/)
