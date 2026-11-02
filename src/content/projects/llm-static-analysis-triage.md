---
title: LLM triage for static-analysis findings
kind: AppSec · MSc dissertation
summary: A Python pipeline that uses a large language model to evaluate Semgrep and Bandit findings, triage likely false positives and generate remediation guidance.
order: 5
icon: code
context: MSc Cybersecurity dissertation, Dublin Business School (First Class Honours)
tools: [Python, LLM, Semgrep, Bandit, OWASP Top 10]
---

## The problem

Static-analysis tools like Semgrep and Bandit are good at finding *possible* vulnerabilities, but they produce a lot of false positives. Developers learn to ignore the output, and real issues get lost in the noise. It's the same alert-fatigue problem a SOC deals with, applied to source code.

## What I built

For my MSc dissertation I built a Python pipeline that:

1. Runs **Semgrep** and **Bandit** against a codebase and collects their findings.
2. Gives each finding, with its surrounding code, to a **large language model**.
3. Has the model assess whether the finding is likely a **true or false positive**.
4. Generates **remediation guidance** for the findings that look real.

## Why it matters for security operations

The idea transfers directly to the SOC: use automation to take the first pass over high-volume, low-precision alerts so that people spend their time on the ones that matter.
