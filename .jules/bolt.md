## 2024-04-10 - React Context Re-render Optimization

**Learning:** React Context Providers in this codebase (like CartContext) frequently re-render when global state or layouts shift. If the `value` prop is an inline object, it forces all consuming components to re-render, even if the underlying context data (e.g., cart items) hasn't changed.
**Action:** Always wrap context provider value objects in `useMemo` to ensure reference equality across renders unless the underlying state dependencies actually change.
