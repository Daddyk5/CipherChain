// Minimal promise wrapper over one IndexedDB object store. Values are
// structured-cloned, so ArrayBuffers and key pairs are stored as-is.
export function createIndexedDbKeyValueStore(databaseName, { indexedDB = globalThis.indexedDB } = {}) {
  if (!indexedDB) {
    throw new Error('IndexedDB is not available. Encrypted messaging needs persistent browser storage.')
  }
  const STORE = 'kv'
  const opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  async function run(mode, operation) {
    const db = await opening
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode)
      const request = operation(transaction.objectStore(STORE))
      transaction.oncomplete = () => resolve(request?.result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  }

  return {
    get: (key) => run('readonly', (store) => store.get(key)),
    set: (key, value) => run('readwrite', (store) => store.put(value, key)).then(() => undefined),
    delete: (key) => run('readwrite', (store) => store.delete(key)).then(() => undefined),
    async close() {
      ;(await opening).close()
    },
  }
}

// Per-wallet database, so two wallets used in one browser never share keys.
export function keyDatabaseName(walletAddress) {
  return `cipherchain-signal-${walletAddress.toLowerCase()}`
}
