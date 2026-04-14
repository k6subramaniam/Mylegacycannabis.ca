## 2024-05-22 - Optimized Payment Record Retrieval
 **Learning:** Large table scans (e.g., `exportAllPaymentRecords`) followed by in-memory filtering (`.find()`) are significantly less efficient than targeted database queries by ID, especially as data grows.
 **Action:** Always use specific `getById` functions for entity retrieval in router mutations instead of fetching all records.
## 2024-04-10 - React Context Re-render Optimization
**Learning:** React Context Providers in this codebase (like CartContext) frequently re-render when global state or layouts shift. If the `value` prop is an inline object, it forces all consuming components to re-render, even if the underlying context data (e.g., cart items) hasn't changed.
**Action:** Always wrap context provider value objects in `useMemo` to ensure reference equality across renders unless the underlying state dependencies actually change.
