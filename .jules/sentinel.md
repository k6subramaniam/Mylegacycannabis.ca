## 2024-05-18 - [Insecure PRNG for OTP]

**Vulnerability:** OTP tokens were being generated using `Math.random()`, which is cryptographically insecure and predictable.
**Learning:** Legacy authentication code often relies on simple random generation without considering attack vectors on tokens like OTPs.
**Prevention:** Always use Node.js `crypto` module (e.g., `crypto.randomInt()`) for generating any security-sensitive tokens, passwords, or identifiers.
