if (typeof window !== 'undefined') {
  if (!window.localStorage) {
    window.localStorage = {
      store: {},
      getItem(k) { return this.store[k] || null },
      setItem(k, v) { this.store[k] = String(v) },
      removeItem(k) { delete this.store[k] },
      clear() { this.store = {} },
    }
  }
  if (!window.sessionStorage) {
    window.sessionStorage = {
      store: {},
      getItem(k) { return this.store[k] || null },
      setItem(k, v) { this.store[k] = String(v) },
      removeItem(k) { delete this.store[k] },
      clear() { this.store = {} },
    }
  }
}
