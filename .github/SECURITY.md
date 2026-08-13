# Security Policy

NoByte is a static, client-side site. Nearly every tool runs entirely in the browser and never sends data anywhere. Only two tools reach the network — DNS lookup (Google/Cloudflare DNS-over-HTTPS) and the dictionary lookup (dictionaryapi.dev) — and this is documented in the README.

## Supported versions

There are no versioned releases. Only the current code on the `main` branch (as deployed at nobyte.in) is supported with security fixes.

## Reporting a vulnerability

Please do not open a public issue for security vulnerabilities. Instead, use GitHub's private reporting:

1. Go to the [Security tab](https://github.com/AnkitSurana/NoByte/security) of this repository.
2. 2. Click "Report a vulnerability" to open a private advisory.
  
   3. Please include:
  
   4. - A description of the issue and its potential impact
      - - Steps to reproduce, or a proof of concept
        - - Which tool(s) or file(s) are affected
         
          - I'll aim to acknowledge reports within a few days and to fix confirmed issues promptly. Since NoByte has no backend and stores no user data, most realistic issues are client-side (e.g. XSS in a tool, or a problem in a vendored library) rather than data breaches — but please report anything that seems off.
         
          - ## Scope
         
          - Out of scope: vulnerabilities in third-party sites NoByte links to, or in the two external APIs it calls (Google/Cloudflare DNS, dictionaryapi.dev) that aren't caused by how NoByte uses them.
          - 
