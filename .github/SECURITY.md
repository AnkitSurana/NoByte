# Security Policy

NoByte is a static, client-side site. Nearly every tool runs entirely in the browser and never sends data anywhere. Only two tools reach the network, and both are [listed in the README](../README.md#tools-that-use-a-third-party-service):

| Tool | Service |
| --- | --- |
| DNS lookup | Google and Cloudflare DNS-over-HTTPS |
| Dictionary | dictionaryapi.dev |

## Supported versions

There are no versioned releases. Only the current code on `main`, as deployed at [nobyte.in](https://nobyte.in), receives security fixes.

## Reporting a vulnerability

Please don't open a public issue for a security vulnerability. Use GitHub's private reporting instead:

1. Go to the [Security tab](https://github.com/AnkitSurana/NoByte/security) of this repository.
2. Click **Report a vulnerability** to open a private advisory.

Include as much of the following as you can:

- What the issue is and what its impact could be
- Steps to reproduce, or a proof of concept
- Which tool or file is affected

I aim to acknowledge a report within a few days and to fix a confirmed issue promptly. NoByte has no backend and stores no user data, so realistic issues are client-side (XSS in a tool, or a flaw in a vendored library) rather than data breaches. Report anything that seems off regardless.

## Out of scope

- Vulnerabilities in third-party sites NoByte links to.
- Vulnerabilities in the two external APIs above, unless caused by how NoByte uses them.
