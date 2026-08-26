import { describe, expect, it } from 'vitest'
import { initialState, reducer, type State } from './store'
import type { SourceDoc } from './lib/pdf/loader'

function makeDoc(id: string, pageCount: number): SourceDoc {
  return {
    id,
    name: `${id}.pdf`,
    bytes: new Uint8Array(),
    proxy: {} as SourceDoc['proxy'],
    pageCount,
    destroy: () => {},
  }
}

describe('reducer', () => {
  it('adds a document and its pages, undoes, and redoes', () => {
    const doc = makeDoc('A', 3)
    const afterAdd = reducer(initialState, { type: 'ADD_DOC', doc })
    expect(afterAdd.pages).toHaveLength(3)
    expect(afterAdd.docs.get('A')).toBe(doc)
    expect(afterAdd.past).toHaveLength(1)
    expect(afterAdd.past[0].label).toBe('add A.pdf')

    const afterUndo = reducer(afterAdd, { type: 'UNDO' })
    expect(afterUndo.pages).toHaveLength(0)
    expect(afterUndo.past).toHaveLength(0)
    expect(afterUndo.future).toHaveLength(1)
    // doc itself is not reclaimed on undo alone
    expect(afterUndo.docs.get('A')).toBe(doc)

    const afterRedo = reducer(afterUndo, { type: 'REDO' })
    expect(afterRedo.pages).toHaveLength(3)
    expect(afterRedo.future).toHaveLength(0)
    expect(afterRedo.past).toHaveLength(1)
  })

  it('deletes pages and undoes back to the original order', () => {
    const doc = makeDoc('A', 3)
    const added = reducer(initialState, { type: 'ADD_DOC', doc })
    const uidToDelete = added.pages[1].uid

    const deleted = reducer(added, { type: 'DELETE_PAGES', uids: new Set([uidToDelete]) })
    expect(deleted.pages).toHaveLength(2)
    expect(deleted.past.at(-1)?.label).toBe('delete page')

    const undone = reducer(deleted, { type: 'UNDO' })
    expect(undone.pages.map((p) => p.uid)).toEqual(added.pages.map((p) => p.uid))
  })

  it('a new action after undo clears future (standard undo/redo invalidation)', () => {
    const doc = makeDoc('A', 2)
    const added = reducer(initialState, { type: 'ADD_DOC', doc })
    const undone = reducer(added, { type: 'UNDO' })
    expect(undone.future).toHaveLength(1)

    const doc2 = makeDoc('B', 1)
    const addedAgain = reducer(undone, { type: 'ADD_DOC', doc: doc2 })
    expect(addedAgain.future).toHaveLength(0)
  })

  it('a drag that returns to its origin commits no history entry', () => {
    const doc = makeDoc('A', 3)
    const added = reducer(initialState, { type: 'ADD_DOC', doc })
    const before = added.pages
    const pastLength = added.past.length

    const committed = reducer(added, { type: 'COMMIT_REORDER', before, label: 'reorder pages' })
    expect(committed).toBe(added) // same-order commit is a true no-op
    expect(committed.past).toHaveLength(pastLength)
  })

  it('a drag that changes order commits exactly one history entry', () => {
    const doc = makeDoc('A', 3)
    const added = reducer(initialState, { type: 'ADD_DOC', doc })
    const before = added.pages
    const reordered = [before[2], before[0], before[1]]

    // live preview during drag many SET_PAGES no history growth
    let state: State = added
    state = reducer(state, { type: 'SET_PAGES', pages: [before[1], before[0], before[2]] })
    state = reducer(state, { type: 'SET_PAGES', pages: reordered })
    expect(state.past).toHaveLength(added.past.length)

    const committed = reducer(state, { type: 'COMMIT_REORDER', before, label: 'reorder pages' })
    expect(committed.past).toHaveLength(added.past.length + 1)
    expect(committed.pages.map((p) => p.uid)).toEqual(reordered.map((p) => p.uid))

    const undone = reducer(committed, { type: 'UNDO' })
    expect(undone.pages.map((p) => p.uid)).toEqual(before.map((p) => p.uid))
  })

  it('reclaims an unreferenced doc once its snapshot falls off the history cap', () => {
    const doc = makeDoc('stranded', 1)
    let state = reducer(initialState, { type: 'ADD_DOC', doc })
    state = reducer(state, { type: 'UNDO' }) // pages no longer references it but docs map still does

    // 51 more undoable actions the 51st push evicts the oldest past entry
    // which triggers the reclaim scan since stranded is unreferenced by then
    for (let i = 0; i < 51; i++) {
      state = reducer(state, { type: 'ADD_DOC', doc: makeDoc(`filler-${i}`, 1) })
    }

    expect(state.docs.has('stranded')).toBe(false)
    expect(state.past).toHaveLength(50)
  })
})
