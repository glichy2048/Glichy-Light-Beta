import { execFileSync } from "node:child_process"
import { expect, it } from "vitest"

it("tokens.json and docs match src/index.css", () => {
  expect(() => execFileSync("node", ["scripts/tokens.mjs", "--check"], { stdio: "pipe" })).not.toThrow()
})
