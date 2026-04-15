## 2024-05-22 - Optimized Payment Record Retrieval
 **Learning:** Large table scans (e.g., `exportAllPaymentRecords`) followed by in-memory filtering (`.find()`) are significantly less efficient than targeted database queries by ID, especially as data grows.
 **Action:** Always use specific `getById` functions for entity retrieval in router mutations instead of fetching all records.
## 2024-04-10 - React Context Re-render Optimization
**Learning:** React Context Providers in this codebase (like CartContext) frequently re-render when global state or layouts shift. If the `value` prop is an inline object, it forces all consuming components to re-render, even if the underlying context data (e.g., cart items) hasn't changed.
**Action:** Always wrap context provider value objects in `useMemo` to ensure reference equality across renders unless the underlying state dependencies actually change.

## 2025-02-20 - Bulk Update Queries using Drizzle
**Learning:** Drizzle ORM lacks a native `bulkUpdate` feature. When modifying multiple rows based on unique IDs (e.g., restoring stock for an order), a `for` loop executing `.update()` leads to severe N+1 query latency.
**Action:** Use Drizzle's `sql` literal helper to construct a single `UPDATE ... SET col = CASE id WHEN ... THEN ... ELSE col END` query with an `inArray(schema.id, ids)` filter. Always reduce/aggregate duplicate entries first before constructing the SQL chunks.

## 2025-02-23 - Vite Bundle Split Optimization
**Learning:** Admin-only charting libraries (like recharts and d3) being bundled into main app chunks can negatively impact the initial load times and overall performance for public users.
**Action:** Always optimize Vite build configurations by leveraging `cssCodeSplit: true` and adding conditional statements in `manualChunks` to extract heavy, route-specific libraries into separate vendor files.
