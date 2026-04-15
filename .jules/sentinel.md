## 2024-05-24 - [Security Enhancement] Add Helmet Middleware

**Vulnerability:** Missing basic security HTTP headers (defense in depth). Additionally, a unit test was incorrectly asserting that any regular user could access admin tRPC routes, providing a false sense of security.
**Learning:** The tRPC router was already properly secured with `adminProcedure`, but the unit test suite was flawed. Express HTTP layer lacked foundational security headers.
**Prevention:** Ensure test cases accurately reflect the intended security assertions (i.e., expecting unauthorized access to throw). Utilize tools like `helmet` to set secure default headers for Express applications while explicitly opting out of policies (like CSP/COEP) that might break legacy frontend implementations until properly configured.
