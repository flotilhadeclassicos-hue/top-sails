import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const cache = {}
const listeners = {}

function notify(key) {
  if (listeners[key]) listeners[key].forEach(fn => fn(cache[key]))
}

async function loadAll() {
  const { data } = await supabase.from('kv_store').select('*')
  if (data) data.forEach(row => { cache[row.key] = row.value })
}

async function dbWrite(key, value) {
  cache[key] = value
  notify(key)
  await supabase.from('kv_store').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}

// Inicializa dados na primeira chamada
let loaded = false
let loadPromise = null
function ensureLoaded() {
  if (loaded) return Promise.resolve()
  if (!loadPromise) loadPromise = loadAll().then(() => { loaded = true })
  return loadPromise
}

export function useLocalState(key, defaultValue) {
  const [state, setState] = useState(() => cache[key] ?? defaultValue)

  useEffect(() => {
    ensureLoaded().then(() => setState(cache[key] ?? defaultValue))
    if (!listeners[key]) listeners[key] = new Set()
    listeners[key].add(setState)
    return () => listeners[key].delete(setState)
  }, [key])

  useEffect(() => {
    const channel = supabase
      .channel(`kv:${key}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kv_store', filter: `key=eq.${key}` },
        (payload) => {
          const v = payload.eventType === 'DELETE' ? defaultValue : payload.new.value
          cache[key] = v
          notify(key)
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [key])

  const set = useCallback((value) => {
    setState(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      dbWrite(key, next)
      return next
    })
  }, [key])

  return [state, set]
}

// Síncrono — usa cache (funciona após loadAll)
export function readLocal(key, defaultValue = []) {
  const v = cache[key]
  return v !== undefined ? v : defaultValue
}

export async function writeLocal(key, value) {
  return dbWrite(key, value)
}

export function preloadAll() {
  return ensureLoaded()
}

export function clearCache() {
  Object.keys(cache).forEach(k => delete cache[k])
  loaded = false
  loadPromise = null
}

export async function reloadAll() {
  clearCache()
  await ensureLoaded()
  Object.keys(listeners).forEach(key => {
    if (listeners[key]) listeners[key].forEach(fn => fn(cache[key]))
  })
}
