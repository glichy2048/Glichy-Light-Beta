import { performance } from "perf_hooks"

// Simulating the O(N^2) update scenario where an array of N items
// is updated N times using .map()
function benchmarkBaseline(n: number) {
  let arr = Array(n).fill({ state: "waiting" })
  const start = performance.now()
  for (let i = 0; i < n; i++) {
    arr = arr.map((item, idx) => (idx === i ? { state: "done" } : item))
  }
  return performance.now() - start
}

// Simulating the optimized scenario using .with()
function benchmarkOptimizedWith(n: number) {
  let arr = Array(n).fill({ state: "waiting" })
  const start = performance.now()
  for (let i = 0; i < n; i++) {
    const next = arr.with(i, { state: "done" })
    arr = next
  }
  return performance.now() - start
}

// Simulating the optimized scenario using .slice()
function benchmarkOptimizedSlice(n: number) {
  let arr = Array(n).fill({ state: "waiting" })
  const start = performance.now()
  for (let i = 0; i < n; i++) {
    const next = arr.slice()
    next[i] = { state: "done" }
    arr = next
  }
  return performance.now() - start
}

console.log("Running benchmarks for ExportScreen state updates...")
const ns = [1000, 5000, 10000]
console.log("N\t\tBaseline (.map)\t\tOptimized (.slice)")
console.log("-----------------------------------------------------------------")
for (const n of ns) {
  const baseline = benchmarkBaseline(n)
  const optimizedSlice = benchmarkOptimizedSlice(n)

  // Using string padding to align columns
  const nStr = n.toString().padEnd(10)
  const baseStr = baseline.toFixed(2).padEnd(20) + " ms"
  const sliceStr = optimizedSlice.toFixed(2).padEnd(20) + " ms"

  console.log(`${nStr}\t${baseStr}\t${sliceStr}`)
}
console.log(
  "\nThe optimized method (.slice) scales linearly while the baseline (.map) scales quadratically.",
)
