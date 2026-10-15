import { describe, expect, it } from "vitest"
import { initialState, reducer, type State } from "../src/app/reducer"
import { selectVisiblePhotos } from "../src/app/store"

const base: State = { ...initialState, preferences: { ...initialState.preferences, groupRawJpeg: false } }
const dev = (s: State, id: number, key: any, value: number, at: number) =>
  reducer(s, { type: "DEVELOP", id, key, value, at })
const develop = (s: State, id: number) => s.photos.find((p) => p.id === id)!.develop

describe("history", () => {
  it("coalesces rapid edits of one slider into a single entry", () => {
    let s = dev(base, 2, "exposure", 5, 1000)
    s = dev(s, 2, "exposure", 10, 1100)
    s = dev(s, 2, "exposure", 15, 1200)
    expect(s.history[2].entries).toHaveLength(2)
    expect(develop(s, 2).exposure).toBe(15)
  })

  it("undoes and redoes", () => {
    let s = dev(base, 2, "exposure", 5, 1000)
    s = dev(s, 2, "contrast", 9, 9000)
    s = reducer(s, { type: "UNDO", id: 2 })
    expect(develop(s, 2).contrast).toBe(0)
    expect(develop(s, 2).exposure).toBe(5)
    s = reducer(s, { type: "REDO", id: 2 })
    expect(develop(s, 2).contrast).toBe(9)
  })

  it("resets to neutral and marks the photo unedited", () => {
    let s = dev(base, 2, "tint", 20, 1)
    s = reducer(s, { type: "RESET_DEVELOP", id: 2, at: 5000 })
    expect(s.photos.find((p) => p.id === 2)!.edited).toBe(false)
  })
})

describe("paste and keywords", () => {
  it("pastes a recipe on several photos as one undoable step each", () => {
    let s = reducer(base, { type: "PASTE_RECIPE", ids: [2, 3], values: { whites: 30 }, at: 1 })
    expect(develop(s, 3).whites).toBe(30)
    s = reducer(s, { type: "UNDO", id: 3 })
    expect(develop(s, 3).whites).toBe(0)
    expect(develop(s, 2).whites).toBe(30)
  })

  it("adds, dedupes and removes keywords", () => {
    let s = reducer(base, { type: "KEYWORD", id: 2, op: "add", keyword: " Zebra " })
    s = reducer(s, { type: "KEYWORD", id: 2, op: "add", keyword: "zebra" })
    expect(s.photos.find((p) => p.id === 2)!.keywords.filter((k) => k === "zebra")).toHaveLength(1)
    s = reducer(s, { type: "KEYWORD", id: 2, op: "remove", keyword: "zebra" })
    expect(s.photos.find((p) => p.id === 2)!.keywords).not.toContain("zebra")
  })
})

describe("filters", () => {
  it("searches across name, camera and keywords", () => {
    const f = (query: string) => selectVisiblePhotos(reducer(base, { type: "FILTER", patch: { query } })).length
    expect(f("")).toBe(base.photos.length)
    expect(f("leica")).toBeGreaterThan(0)
    expect(f("zzzz")).toBe(0)
  })

  it("limits the recently-added collection", () => {
    const s = reducer(base, { type: "FILTER", patch: { collection: "recent" } })
    expect(selectVisiblePhotos(s)).toHaveLength(12)
  })
})
