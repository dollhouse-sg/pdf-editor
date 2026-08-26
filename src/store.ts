import { useCallback, useReducer } from 'react'
import type { GridPage } from './lib/pdf/export'
import type { SourceDoc } from './lib/pdf/loader'
import { releaseThumbnails } from './lib/pdf/thumbnails'

export type { GridPage }

type Snapshot = { pages: GridPage[]; label: string }

export type State = {
  docs: Map<string, SourceDoc>
  pages: GridPage[]
  past: Snapshot[]
  future: Snapshot[]
}

export const initialState: State = { docs: new Map(), pages: [], past: [], future: [] }

const MAX_HISTORY = 50

type Action =
  | { type: 'ADD_DOC'; doc: SourceDoc }
  | { type: 'DELETE_PAGES'; uids: Set<string> }
  | { type: 'SET_PAGES'; pages: GridPage[] } // transient live drag preview no history entry
  | { type: 'COMMIT_REORDER'; before: GridPage[]; label: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }

function sameOrder(a: GridPage[], b: GridPage[]): boolean {
  return a.length === b.length && a.every((p, i) => p.uid === b[i].uid)
}

/** Caps past at MAX_HISTORY and reports whether an entry was evicted */
function capHistory(past: Snapshot[]): { past: Snapshot[]; evicted: boolean } {
  if (past.length <= MAX_HISTORY) return { past, evicted: false }
  return { past: past.slice(1), evicted: true }
}

/** Drops SourceDocs no longer referenced by the present or any surviving snapshot */
function reclaimDocs(state: State): Map<string, SourceDoc> {
  const referenced = new Set<string>()
  for (const p of state.pages) referenced.add(p.docId)
  for (const snap of state.past) for (const p of snap.pages) referenced.add(p.docId)
  for (const snap of state.future) for (const p of snap.pages) referenced.add(p.docId)

  const docs = new Map(state.docs)
  for (const [id, doc] of docs) {
    if (!referenced.has(id)) {
      doc.destroy()
      releaseThumbnails(id)
      docs.delete(id)
    }
  }
  return docs
}

function withHistory(state: State, pastEntry: Snapshot, rest: Omit<State, 'docs' | 'past' | 'future'>): State {
  const { past, evicted } = capHistory([...state.past, pastEntry])
  const next: State = { ...state, ...rest, past, future: [] }
  return evicted ? { ...next, docs: reclaimDocs(next) } : next
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_DOC': {
      const { doc } = action
      const newPages: GridPage[] = Array.from({ length: doc.pageCount }, (_, i) => ({
        uid: crypto.randomUUID(),
        docId: doc.id,
        pageIndex: i,
      }))
      const docs = new Map(state.docs)
      docs.set(doc.id, doc)
      return withHistory(
        { ...state, docs },
        { pages: state.pages, label: `add ${doc.name}` },
        { pages: [...state.pages, ...newPages] },
      )
    }

    case 'DELETE_PAGES': {
      const { uids } = action
      if (state.pages.every((p) => !uids.has(p.uid))) return state
      const label = uids.size === 1 ? 'delete page' : `delete ${uids.size} pages`
      return withHistory(state, { pages: state.pages, label }, { pages: state.pages.filter((p) => !uids.has(p.uid)) })
    }

    case 'SET_PAGES':
      return { ...state, pages: action.pages }

    case 'COMMIT_REORDER': {
      const { before, label } = action
      if (sameOrder(before, state.pages)) return state
      return withHistory(state, { pages: before, label }, { pages: state.pages })
    }

    case 'UNDO': {
      const last = state.past[state.past.length - 1]
      if (!last) return state
      return {
        ...state,
        pages: last.pages,
        past: state.past.slice(0, -1),
        future: [...state.future, { pages: state.pages, label: last.label }],
      }
    }

    case 'REDO': {
      const next = state.future[state.future.length - 1]
      if (!next) return state
      return {
        ...state,
        pages: next.pages,
        future: state.future.slice(0, -1),
        past: [...state.past, { pages: state.pages, label: next.label }],
      }
    }
  }
}

export function usePdfStore() {
  const [state, dispatch] = useReducer(reducer, initialState)

  return {
    state,
    addDocument: useCallback((doc: SourceDoc) => dispatch({ type: 'ADD_DOC', doc }), []),
    deletePages: useCallback((uids: Set<string>) => dispatch({ type: 'DELETE_PAGES', uids }), []),
    setPagesTransient: useCallback((pages: GridPage[]) => dispatch({ type: 'SET_PAGES', pages }), []),
    commitReorder: useCallback(
      (before: GridPage[], label: string) => dispatch({ type: 'COMMIT_REORDER', before, label }),
      [],
    ),
    undo: useCallback(() => dispatch({ type: 'UNDO' }), []),
    redo: useCallback(() => dispatch({ type: 'REDO' }), []),
  }
}
