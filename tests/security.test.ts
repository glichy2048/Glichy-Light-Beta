import { describe, expect, it } from "vitest"
import { sanitizeDevelopValue, sanitizeRecipe, NEUTRAL } from "../src/app/develop"
import { sanitizeFileName } from "../src/app/raw"
import { reducer, initialState } from "../src/app/reducer"

describe("Security & Input Sanitization", () => {
  describe("sanitizeFileName", () => {
    it("strips path traversal attacks and path separators", () => {
      expect(sanitizeFileName("../../etc/passwd")).toBe("passwd")
      expect(sanitizeFileName("..\\..\\windows\\system32\\cmd.exe")).toBe("cmd.exe")
      expect(sanitizeFileName("photos/my_pic.jpg")).toBe("my_pic.jpg")
    })

    it("strips illegal control characters and dangerous symbols", () => {
      expect(sanitizeFileName("bad<script>name.png")).toBe("bad_script_name.png")
      expect(sanitizeFileName("test\u0000photo.jpg")).toBe("testphoto.jpg")
    })

    it("falls back to a safe default if input is empty or invalid", () => {
      expect(sanitizeFileName("")).toBe("unnamed_photo")
      expect(sanitizeFileName("   ")).toBe("photo")
    })
  })

  describe("sanitizeDevelopValue & sanitizeRecipe", () => {
    it("clamps out-of-range slider numbers to safe bounds", () => {
      expect(sanitizeDevelopValue("exposure", 500)).toBe(100)
      expect(sanitizeDevelopValue("exposure", -300)).toBe(-100)
      expect(sanitizeDevelopValue("rotation", 720)).toBe(180)
      expect(sanitizeDevelopValue("rotation", -999)).toBe(-180)
      expect(sanitizeDevelopValue("sharpRadius", 50)).toBe(3)
      expect(sanitizeDevelopValue("clarity", -20)).toBe(0)
    })

    it("guards against NaN, Infinity, and invalid types", () => {
      expect(sanitizeDevelopValue("exposure", NaN)).toBe(NEUTRAL.exposure)
      expect(sanitizeDevelopValue("contrast", Infinity)).toBe(NEUTRAL.contrast)
      expect(sanitizeDevelopValue("contrast", -Infinity)).toBe(NEUTRAL.contrast)
      expect(sanitizeDevelopValue("highlights", "malicious_string" as unknown as number)).toBe(NEUTRAL.highlights)
      expect(sanitizeDevelopValue("lensProfile", "yes" as unknown as boolean)).toBe(true)
    })

    it("safely sanitizes full recipe objects against poisoned keys", () => {
      const malicious = {
        exposure: 9999,
        contrast: NaN,
        __proto__: { admin: true },
        unknownField: "danger",
      } as unknown as Parameters<typeof sanitizeRecipe>[0]

      const clean = sanitizeRecipe(malicious)
      expect(clean.exposure).toBe(100)
      expect(clean.contrast).toBe(0)
      expect((clean as unknown as Record<string, unknown>).unknownField).toBeUndefined()
    })
  })

  describe("Reducer resilience with poisoned actions", () => {
    it("handles DEVELOP action with NaN safely", () => {
      const state = reducer(initialState, {
        type: "DEVELOP",
        id: 1,
        key: "exposure",
        value: NaN,
        at: Date.now(),
      })
      const photo = state.photos.find((p) => p.id === 1)
      expect(Number.isFinite(photo?.develop.exposure)).toBe(true)
    })

    it("handles PASTE_RECIPE with out-of-bounds parameters safely", () => {
      const state = reducer(initialState, {
        type: "PASTE_RECIPE",
        ids: [1, 2],
        values: { exposure: 400, rotation: 999 } as unknown as Parameters<typeof sanitizeRecipe>[0],
        at: Date.now(),
      })
      const p1 = state.photos.find((p) => p.id === 1)
      const p2 = state.photos.find((p) => p.id === 2)
      expect(p1?.develop.exposure).toBe(100)
      expect(p1?.develop.rotation).toBe(180)
      expect(p2?.develop.exposure).toBe(100)
      expect(p2?.develop.rotation).toBe(180)
    })
  })
})
