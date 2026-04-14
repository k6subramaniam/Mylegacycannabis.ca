## 2024-05-22 - Optimized Payment Record Retrieval
 **Learning:** Large table scans (e.g., `exportAllPaymentRecords`) followed by in-memory filtering (`.find()`) are significantly less efficient than targeted database queries by ID, especially as data grows.
 **Action:** Always use specific `getById` functions for entity retrieval in router mutations instead of fetching all records.
