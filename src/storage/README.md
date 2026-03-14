# `/storage` - IndexedDB Persistence Hub

The **Storage** domain is the generic facade abstracting asynchronous local persistence mechanisms. Moat currently leverages `idb-keyval` for fast, non-blocking `IndexedDB` caching securely abstracted against quota failures or synchronization limits.

## Included 
* **`storage.ts`**: The `StorageBackend` abstraction mapping `get`/`set`/`update` queries strictly into `idb-keyval` equivalents, catching errors implicitly to prevent application crashes.
* **`usePersistentState.ts` / `usePersistentReducer.ts`**: Heavily tested universal hydration wrappers that safely bridge the asynchronous `IndexedDB` boundary into synchronous React components natively, allowing fluid UI updates instantly matched by eventual, debounced disk writes.
