## 2024-04-10 - React Context Re-render Optimization
**Learning:** React Context Providers in this codebase (like CartContext) frequently re-render when global state or layouts shift. If the `value` prop is an inline object, it forces all consuming components to re-render, even if the underlying context data (e.g., cart items) hasn't changed.
**Action:** Always wrap context provider value objects in `useMemo` to ensure reference equality across renders unless the underlying state dependencies actually change.

## 2025-02-20 - Bulk Update Queries using Drizzle
**Learning:** Drizzle ORM lacks a native `bulkUpdate` feature. When modifying multiple rows based on unique IDs (e.g., restoring stock for an order), a `for` loop executing `.update()` leads to severe N+1 query latency.
**Action:** Use Drizzle's `sql` literal helper to construct a single `UPDATE ... SET col = CASE id WHEN ... THEN ... ELSE col END` query with an `inArray(schema.id, ids)` filter. Always reduce/aggregate duplicate entries first before constructing the SQL chunks.
## 2025-04-15 - Enable Express Compression
 **Learning:** Express server by default does not compress assets, leading to large payloads sent to clients and slow FCP.
 **Action:** Add `compression` middleware as the first middleware in the Express application to compress all responses.
