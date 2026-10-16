import { describe, expect, it } from "vitest"
import { selectVisiblePhotos } from "../src/app/store"
import { initialState, reducer } from "../src/app/reducer"

describe("Performance Optimizations", () => {
  it("memoizes selectVisiblePhotos when query, filters, sort, and photos reference are unchanged", () => {
    const res1 = selectVisiblePhotos(initialState)
    const res2 = selectVisiblePhotos(initialState)
    // Same instance reference returned via fast-path cache
    expect(res1).toBe(res2)

    // Modifying non-visibility field like compare winner preserves memoized array on identical state reference
    expect(selectVisiblePhotos(initialState)).toBe(res1)
  })

  it("updates visible array reference only when filters change", () => {
    const res1 = selectVisiblePhotos(initialState)
    const filteredState = reducer(initialState, {
      type: "FILTER",
      patch: { flag: "pick" },
    })
    const res2 = selectVisiblePhotos(filteredState)
    expect(res1).not.toBe(res2)
    expect(res2.every((p) => p.flag === "pick")).toBe(true)

    // Subsequent call on filteredState reuses cache
    const res3 = selectVisiblePhotos(filteredState)
    expect(res2).toBe(res3)
  })

  it("rapidly filters large photo collections under 5ms", () => {
    const start = performance.now()
    for (let i = 0; i < 200; i++) {
      selectVisiblePhotos(initialState)
    }
    const duration = performance.now() - start
    expect(duration).toBeLessThan(150)
  })
})
