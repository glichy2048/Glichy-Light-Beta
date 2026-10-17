import { describe, expect, it } from "vitest"
import { SHORTCUTS_DATA, CATEGORY_LABELS } from "../src/components/KeyboardShortcutGuide"

describe("KeyboardShortcutGuide Data & Functionality", () => {
  it("contains all critical workflow shortcuts", () => {
    expect(SHORTCUTS_DATA.length).toBeGreaterThanOrEqual(20)

    const ids = SHORTCUTS_DATA.map((s) => s.id)
    // Navigation
    expect(ids).toContain("nav-library")
    expect(ids).toContain("nav-review")
    expect(ids).toContain("nav-compare")
    expect(ids).toContain("nav-develop")

    // Culling
    expect(ids).toContain("review-pick")
    expect(ids).toContain("review-reject")
    expect(ids).toContain("review-unflag")
    expect(ids).toContain("review-rate")

    // Develop
    expect(ids).toContain("dev-before-after")
    expect(ids).toContain("dev-cycle-layout")
    expect(ids).toContain("dev-zoom")
    expect(ids).toContain("dev-clipping")
    expect(ids).toContain("dev-lens-enter")

    // Compare
    expect(ids).toContain("cmp-select-winner")
    expect(ids).toContain("cmp-develop-winner")

    // Recipe & Clipboard
    expect(ids).toContain("global-copy")
    expect(ids).toContain("global-paste")
  })

  it("verifies every shortcut item has valid keys, action, description, and scope", () => {
    for (const item of SHORTCUTS_DATA) {
      expect(item.id).toBeTruthy()
      expect(item.keys.length).toBeGreaterThan(0)
      expect(item.action).toBeTruthy()
      expect(item.description).toBeTruthy()
      expect(item.scope).toBeTruthy()
      expect(["navigation", "culling", "develop", "compare", "library"]).toContain(item.category)
    }
  })

  it("has valid category labels mapping for all supported categories", () => {
    const categories = ["all", "navigation", "culling", "develop", "compare", "library"] as const
    for (const cat of categories) {
      expect(CATEGORY_LABELS[cat]).toBeDefined()
      expect(typeof CATEGORY_LABELS[cat]).toBe("string")
    }
  })

  it("verifies search query matching logic", () => {
    const query = "zoom"
    const matched = SHORTCUTS_DATA.filter((s) =>
      s.action.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query) ||
      s.keys.some((k) => k.toLowerCase().includes(query))
    )
    expect(matched.length).toBeGreaterThanOrEqual(2)
    expect(matched.some((s) => s.id === "dev-zoom")).toBe(true)
    expect(matched.some((s) => s.id === "cmp-zoom-cycle")).toBe(true)
  })

  it("verifies Before/After keys matching \\ and Y", () => {
    const backslashShortcut = SHORTCUTS_DATA.find((s) => s.keys.includes("\\"))
    expect(backslashShortcut).toBeDefined()
    expect(backslashShortcut?.id).toBe("dev-before-after")

    const yShortcut = SHORTCUTS_DATA.find((s) => s.category === "develop" && s.keys.includes("Y"))
    expect(yShortcut).toBeDefined()
    expect(yShortcut?.id).toBe("dev-cycle-layout")
  })
})
