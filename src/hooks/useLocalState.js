import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const cache     = {}
const listeners = {}

// ── Canais Realtime: singleton por key (shared entre componentes) ──────────
const channels = {}  // key -> { channel, refs, defaultValue }

function acquireChannel(key, defaultValue) {
  if (channels[key]) {
    channels[key].refs++
    return
  }
  const channel = supabase
    .channel(`kv:${key}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'kv_store', filter: `key=eq.${key}` },
      (payload) => {
        const v = payload.eventType === 'DELETE' ? defaultValue : payload.new.value
        cache[key] = v
        notify(key)
      }
    )
    .subscribe()
  channels[key] = { channel, refs: 1 }
}

function releaseChannel(key) {
  if (!channels[key]) return
  channels[key].refs--
  if (channels[key].refs <= 0) {
    supabase.removeChannel(channels[key].channel)
    delete channels[key]
  }
}

// ──────────────────────────────────────────────────────────────────────────

function notify(key) {
  if (listeners[key]) listeners[key].forEach(fn => fn(cache[key]))
}

async function loadAll() {
  try {
    const { data, error } = await supabase.from('kv_store').select('*')
    if (error) { console.error('kv_store loadAll error:', error.message); return }
    if (data) data.forEach(row => { cache[row.key] = row.value })
  } catch (e) {
    console.error('kv_store loadAll exception:', e)
  }
}

async function dbWrite(key, value) {
  cache[key] = value
  notify(key)
  await supabase.from('kv_store').upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
}

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
    // Carrega dados e registra listener React
    ensureLoaded().then(() => setState(cache[key] ?? defaultValue))
    if (!listeners[key]) listeners[key] = new Set()
    listeners[key].add(setState)

    // Subscrição Realtime singleton: só cria canal se ainda não existe para esta key
    acquireChannel(key, defaultValue)

    return () => {
      listeners[key].delete(setState)
      releaseChannel(key)
    }
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

// Síncrono — lê do cache (funciona após loadAll)
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
