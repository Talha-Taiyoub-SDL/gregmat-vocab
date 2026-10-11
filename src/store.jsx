import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'

const KEY = 'vocab-state-v1'
const SYNC_KEY = 'vocab-synced-at'
const USER_KEY = 'vocab-user'
const EMPTY = { categories: [], progress: {}, updatedAt: 0 }

const load = () => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    return s && s.categories && s.progress ? { ...EMPTY, ...s } : EMPTY
  } catch {
    return EMPTY
  }
}

const uid = () => Math.random().toString(36).slice(2, 10)

// Combine two copies: union of categories, and for each word keep the copy with more answers.
function merge(a, b) {
  const cats = new Map()
  for (const c of [...b.categories, ...a.categories]) {
    const ex = cats.get(c.id)
    if (ex) ex.wordIds = [...new Set([...ex.wordIds, ...c.wordIds])]
    else cats.set(c.id, { ...c, wordIds: [...c.wordIds] })
  }
  const progress = { ...b.progress }
  for (const [id, p] of Object.entries(a.progress)) {
    const q = progress[id]
    if (!q || p.k + p.u > q.k + q.u) progress[id] = p
  }
  return { categories: [...cats.values()], progress }
}

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

export function StoreProvider({ children }) {
  const [state, setState] = useState(load)
  const [session, setSession] = useState(null)
  const [sync, setSync] = useState(supabase ? 'signed-out' : 'local')
  const syncedAt = useRef(Number(localStorage.getItem(SYNC_KEY)) || 0)
  const ready = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const push = useCallback(async (s, userId) => {
    setSync('saving')
    const { error } = await supabase.from('user_data').upsert({
      user_id: userId,
      data: { categories: s.categories, progress: s.progress },
      updated_at: new Date(s.updatedAt).toISOString(),
    })
    if (error) {
      setSync('error')
      return false
    }
    syncedAt.current = s.updatedAt
    localStorage.setItem(SYNC_KEY, String(s.updatedAt))
    setSync('synced')
    return true
  }, [])

  // On sign-in / app start: reconcile this device with the saved copy in Supabase.
  useEffect(() => {
    ready.current = false
    if (!supabase) return
    if (!session) {
      setSync('signed-out')
      return
    }
    let cancelled = false
    const userId = session.user.id
    ;(async () => {
      setSync('saving')
      // A different account signing in on this device must not inherit the previous account's data.
      const lastUser = localStorage.getItem(USER_KEY)
      let local = stateRef.current
      if (lastUser && lastUser !== userId) {
        local = EMPTY
        setState(EMPTY)
        syncedAt.current = 0
        localStorage.setItem(SYNC_KEY, '0')
      }
      localStorage.setItem(USER_KEY, userId)

      const { data, error } = await supabase
        .from('user_data')
        .select('data, updated_at')
        .eq('user_id', userId)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setSync('error')
        return
      }
      const dirty = local.updatedAt > syncedAt.current
      if (!data) {
        if (local.categories.length || Object.keys(local.progress).length) await push(local, userId)
        else setSync('synced')
      } else {
        const remoteMs = new Date(data.updated_at).getTime()
        const remote = {
          categories: data.data?.categories || [],
          progress: data.data?.progress || {},
        }
        if (remoteMs > syncedAt.current) {
          if (!dirty) {
            setState({ ...remote, updatedAt: remoteMs })
            syncedAt.current = remoteMs
            localStorage.setItem(SYNC_KEY, String(remoteMs))
            setSync('synced')
          } else {
            const merged = { ...merge(local, remote), updatedAt: Date.now() }
            setState(merged)
            await push(merged, userId)
          }
        } else if (dirty) {
          await push(local, userId)
        } else {
          setSync('synced')
        }
      }
      if (!cancelled) ready.current = true
    })()
    return () => {
      cancelled = true
    }
  }, [session?.user?.id, push])

  // After the first reconcile, save changes shortly after they happen.
  useEffect(() => {
    if (!supabase || !session || !ready.current) return
    if (state.updatedAt <= syncedAt.current) return
    const t = setTimeout(() => push(state, session.user.id), 800)
    return () => clearTimeout(t)
  }, [state, session, push])

  const update = useCallback((fn) => setState((s) => ({ ...fn(s), updatedAt: Date.now() })), [])

  const actions = useMemo(
    () => ({
      createCategory(name, wordId) {
        const id = uid()
        update((s) => ({
          ...s,
          categories: [...s.categories, { id, name: name.trim(), wordIds: wordId ? [wordId] : [] }],
        }))
        return id
      },
      renameCategory(id, name) {
        update((s) => ({
          ...s,
          categories: s.categories.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)),
        }))
      },
      deleteCategory(id) {
        update((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) }))
      },
      setInCategory(catId, wordId, on) {
        update((s) => ({
          ...s,
          categories: s.categories.map((c) =>
            c.id !== catId
              ? c
              : {
                  ...c,
                  wordIds: on
                    ? [...new Set([...c.wordIds, wordId])]
                    : c.wordIds.filter((x) => x !== wordId),
                }
          ),
        }))
      },
      record(wordId, correct) {
        update((s) => {
          const p = s.progress[wordId] || { k: 0, u: 0, last: null }
          return {
            ...s,
            progress: {
              ...s.progress,
              [wordId]: { k: p.k + (correct ? 1 : 0), u: p.u + (correct ? 0 : 1), last: correct ? 'k' : 'u' },
            },
          }
        })
      },
      resetProgress() {
        update((s) => ({ ...s, progress: {} }))
      },
      signIn() {
        supabase?.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
      },
      signOut() {
        supabase?.auth.signOut()
      },
    }),
    [update]
  )

  const value = useMemo(
    () => ({ state, session, sync, hasBackend: !!supabase, ...actions }),
    [state, session, sync, actions]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
