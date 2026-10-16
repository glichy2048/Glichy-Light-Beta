import {
useEffect,useRef,
useState
} from "react"
import {
applyTone,
approxFilter,
drawGeometry,
getProfileDistortion,
toneKey
} from "../app/develop"
import type { DevelopValues,Photo } from "../app/types"
import { PhotoArt } from "./ui"

import { Log } from "../app/diagnostics"

export type WorkingImage = { data: Uint8ClampedArray; w: number; h: number }
export const workingCache = new Map<string, Promise<WorkingImage>>()
export const WORK_MAX = 1400

export function loadWorkingImage(src: string): Promise<WorkingImage> {
  let hit = workingCache.get(src)
  if (!hit) {
    const t0 = performance.now()
    hit = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, WORK_MAX / Math.max(img.naturalWidth, img.naturalHeight))
        const w = Math.max(1, Math.round(img.naturalWidth * scale))
        const h = Math.max(1, Math.round(img.naturalHeight * scale))
        const c = document.createElement("canvas")
        c.width = w
        c.height = h
        const ctx = c.getContext("2d", { willReadFrequently: true })
        if (!ctx) {
          reject(new Error("Failed to get canvas 2d context"))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        Log.d("ImagePipeline", `Decoded image ${src.slice(0, 32)} (${w}×${h}) in ${Math.round(performance.now() - t0)}ms`)
        resolve({ data: ctx.getImageData(0, 0, w, h).data, w, h })
      }
      img.onerror = () => {
        Log.w("ImagePipeline", `Failed to decode working image from source: ${src.slice(0, 40)}`)
        reject(new Error("decode failed"))
      }
      img.src = src
    })
    workingCache.set(src, hit)
    if (workingCache.size > 6)
      workingCache.delete(workingCache.keys().next().value as string)
  }
  return hit
}

export function DevelopedImage({
  photo,
  recipe,
  onHistogram,
  clipping = false,
}: {
  photo: Photo
  recipe: DevelopValues
  onHistogram?: (data: number[][]) => void
  clipping?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const clipRef = useRef<HTMLCanvasElement>(null)
  const tonedRef = useRef<{ key: string; canvas: HTMLCanvasElement; clip: HTMLCanvasElement } | null>(null)
  const histRef = useRef(onHistogram)
  histRef.current = onHistogram
  const [work, setWork] = useState<{ src: string; image: WorkingImage } | null>(null)
  const src = photo.previewUrl
  useEffect(() => {
    if (!src) return
    let live = true
    loadWorkingImage(src)
      .then((image) => live && setWork({ src, image }))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [src])
  const tk = toneKey(recipe)
  useEffect(() => {
    if (!src || !work || work.src !== src) return
    const id = requestAnimationFrame(() => {
      const { image } = work
      const key = `${src}|${tk}`
      if (tonedRef.current?.key !== key) {
        const result = applyTone(image.data, image.w, image.h, recipe)
        const canvas = document.createElement("canvas")
        canvas.width = image.w
        canvas.height = image.h
        canvas
          .getContext("2d")!
          .putImageData(new ImageData(result.data as Uint8ClampedArray<ArrayBuffer>, image.w, image.h), 0, 0)
        const clip = document.createElement("canvas")
        clip.width = image.w
        clip.height = image.h
        const mark = new Uint8ClampedArray(result.data.length)
        const px = result.data
        for (let o = 0; o < px.length; o += 4) {
          const hi = px[o] === 255 || px[o + 1] === 255 || px[o + 2] === 255
          const lo = px[o] === 0 || px[o + 1] === 0 || px[o + 2] === 0
          if (hi || lo) {
            mark[o] = hi ? 235 : 40
            mark[o + 1] = hi ? 60 : 110
            mark[o + 2] = hi ? 50 : 255
            mark[o + 3] = 200
          }
        }
        clip.getContext("2d")!.putImageData(new ImageData(mark as Uint8ClampedArray<ArrayBuffer>, image.w, image.h), 0, 0)
        tonedRef.current = { key, canvas, clip }
        histRef.current?.(result.histogram)
      }
      const netDistortion =
        (recipe.lensProfile ? getProfileDistortion(recipe.lensModel) : 0) +
        (recipe.distortion ?? 0)
      if (canvasRef.current && tonedRef.current)
        drawGeometry(
          canvasRef.current,
          tonedRef.current.canvas,
          recipe.rotation,
          recipe.vertical,
          netDistortion,
        )
      if (clipRef.current && tonedRef.current && clipping)
        drawGeometry(
          clipRef.current,
          tonedRef.current.clip,
          recipe.rotation,
          recipe.vertical,
          netDistortion,
        )
    })
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    src,
    work,
    tk,
    clipping,
    recipe.rotation,
    recipe.vertical,
    recipe.lensProfile,
    recipe.lensModel,
    recipe.distortion,
  ])

  if (!src)
    return (
      <PhotoArt
        tone={photo.tone}
        label={photo.name}
        style={{
          filter: approxFilter(recipe),
          transform: `rotate(${recipe.rotation}deg) scale(${1 + Math.abs(recipe.rotation) / 60 + Math.abs(recipe.vertical) / 250})`,
        }}
      />
    )
  return (
    <div className="photo-art has-image dev-image" role="img" aria-label={photo.name}>
      <canvas ref={canvasRef} />
      {clipping && <canvas ref={clipRef} className="clip-overlay" />}
    </div>
  )
}

