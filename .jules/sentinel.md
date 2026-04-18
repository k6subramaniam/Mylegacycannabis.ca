## 2024-05-24 - [Security Enhancement] Add Helmet Middleware

**Vulnerability:** Missing basic security HTTP headers (defense in depth). Additionally, a unit test was incorrectly asserting that any regular user could access admin tRPC routes, providing a false sense of security.
**Learning:** The tRPC router was already properly secured with `adminProcedure`, but the unit test suite was flawed. Express HTTP layer lacked foundational security headers.
**Prevention:** Ensure test cases accurately reflect the intended security assertions (i.e., expecting unauthorized access to throw). Utilize tools like `helmet` to set secure default headers for Express applications while explicitly opting out of policies (like CSP/COEP) that might break legacy frontend implementations until properly configured.

## 2025-05-14 - [Vulnerability Fix] Sensitive OTP Code Logged in Fallback SMS
 **Vulnerability:** One-Time Password (OTP) codes were directly printed to the server console in fallback and debugging log statements.
 **Learning:** Debugging logs often capture sensitive state during edge cases (e.g., service failure fallbacks) where secrets are temporarily held in local variables.
 **Prevention:** Strictly audit all log statements for sensitive data. Use non-sensitive identifiers (like user ID or normalized phone) for log context and rely on the database as the secure source of truth for administrative verification of secrets.
