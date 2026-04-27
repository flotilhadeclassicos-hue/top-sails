import { useState, useCallback } from 'react'

export function useLocalState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const set = useCallback((value) => {
    setState(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }, [key])

  return [state, set]
}

export function readLocal(key, defaultValue = []) {
  try {
    const stored = localStorage.getItem(key)
    return stored !== null ? JSON.parse(stored) : defaultValue
  } catch { return defaultValue }
}

export function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}
