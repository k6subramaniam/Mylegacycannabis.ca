## 2024-04-10 - React Context Re-render Optimization

**Learning:** React Context Providers in this codebase (like CartContext) frequently re-render when global state or layouts shift. If the `value` prop is an inline object, it forces all consuming components to re-render, even if the underlying context data (e.g., cart items) hasn't changed.
**Action:** Always wrap context provider value objects in `useMemo` to ensure reference equality across renders unless the underlying state dependencies actually change.
## 2024-05-19 - Use direct lookup query over scanning exported data
 **Learning:** Using `exportAllPaymentRecords().find(...)` effectively performs a full table scan and transfers massive payload to application memory when only fetching one item is needed.
 **Action:** Instead of fetching all the records and then using javascript to find one element, implement `getPaymentRecordById` which limits rows via DB indexing and `where id = ?` or equivalent approach for any resource in `.find(...)`.
