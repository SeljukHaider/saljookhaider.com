---
title: Investigating a suspicious PCAP in Wireshark
kind: Network · Traffic analysis playbook
summary: A repeatable workflow for working through a packet capture, from protocol overview to C2 beaconing, DNS abuse and file downloads, with the exact Wireshark filters and how each finding becomes an IOC.
order: 2
featured: true
icon: network
context: Lab methodology, built from BTL1 labs and practice captures
tools: [Wireshark, TCP/IP, DNS, HTTP/TLS, VirusTotal, WHOIS]
mitre:
  - { id: T1046, name: Network Service Discovery, tactic: Discovery }
  - { id: T1071.001, name: Web Protocols, tactic: Command and Control }
  - { id: T1071.004, name: DNS, tactic: Command and Control }
  - { id: T1105, name: Ingress Tool Transfer, tactic: Command and Control }
  - { id: T1041, name: Exfiltration Over C2 Channel, tactic: Exfiltration }
---

## Objective

A packet capture is the closest thing to ground truth on a network, but a 200 MB PCAP is mostly noise. The goal of this playbook is to get from "here's a capture from a host that alerted" to a short list of **who talked to whom, what was transferred, and which indicators to block**, in a fixed order so nothing gets skipped.

## Environment

| Item | Detail |
| --- | --- |
| Tool | Wireshark (with `tshark` for bulk extraction) |
| Input | PCAP from a sensor or an endpoint capture |
| Enrichment | VirusTotal, WHOIS, passive DNS, AbuseIPDB |
| Output | Timeline of key connections, IOC list, extracted files with hashes |

## Methodology

### 1. Get the big picture first

Before filtering anything:

- **Statistics → Capture File Properties**: time span and packet count
- **Statistics → Protocol Hierarchy**: anything unexpected (raw TCP, IRC, lots of DNS)?
- **Statistics → Conversations / Endpoints**, sorted by bytes: the top talkers are usually where the story is

### 2. Identify the victim and the timeline

```wireshark
dhcp || nbns || kerberos.CNameString
```

DHCP, NetBIOS and Kerberos traffic usually give away the hostname, MAC address and user account of the internal machine.

### 3. Look for scanning

A host sending lots of SYNs and getting few answers is scanning:

```wireshark
tcp.flags.syn == 1 && tcp.flags.ack == 0
```

Then check **Statistics → Conversations → TCP** for one source hitting many ports or many hosts.

### 4. Review DNS

```wireshark
dns.flags.response == 0
```

Things to look for: newly registered or random-looking domains, failed lookups (`dns.flags.rcode != 0`), and very long query names that can indicate DNS tunnelling:

```wireshark
len(dns.qry.name) > 50
```

### 5. Review HTTP and TLS

```wireshark
http.request
```

Check the method, host, URI and user agent. Then look at what came back: **File → Export Objects → HTTP** recovers downloaded files so they can be hashed and checked.

For encrypted traffic, the TLS Client Hello still shows the destination name:

```wireshark
tls.handshake.type == 1
```

Add `tls.handshake.extensions_server_name` as a column to list every HTTPS destination.

### 6. Spot beaconing

Malware calling home tends to connect to the same destination at regular intervals with similar packet sizes. Filter to the suspect IP (`ip.addr == x.x.x.x`) and open **Statistics → I/O Graphs**: a steady comb of spikes is a strong beaconing signal. **Follow → TCP Stream** shows the actual content when it isn't encrypted.

### 7. Check for exfiltration

Sort **Conversations** by *Bytes A → B*. An internal host uploading far more than it downloads to an external address deserves a close look, especially over HTTP POST:

```wireshark
http.request.method == "POST"
```

## Evidence

Each investigation produces:

- A short timeline: first contact, download, beacon start, any upload
- The filter used for every finding, so anyone can reproduce it
- Exported files with SHA-256 hashes and VirusTotal results
- Domains and IPs with WHOIS creation date, ASN and reputation

## What the findings usually look like

| Signal | Why it matters |
| --- | --- |
| Domain registered days ago | Attackers register infrastructure shortly before use |
| HTTP download of `.exe`, `.dll` or a script from a raw IP | Typical second-stage delivery (T1105) |
| Regular connections every N seconds | C2 beaconing (T1071) |
| Long random subdomains to one parent domain | Possible DNS tunnelling (T1071.004) |
| Large outbound POST or upload | Possible exfiltration (T1041) |

## MITRE ATT&CK mapping

Scanning maps to **T1046**, HTTP/HTTPS command and control to **T1071.001**, DNS-based C2 to **T1071.004**, payload downloads to **T1105** and data leaving over the same channel to **T1041**.

## Conclusion and recommendations

- **Block** confirmed domains and IPs at the proxy, firewall and DNS resolver.
- **Hunt** for the same indicators in proxy, DNS and firewall logs for every other host.
- **Contain** the source host and hand the extracted files to malware analysis.
- **Improve visibility:** DNS query logging and TLS SNI logging make most of these checks possible without a full packet capture.
