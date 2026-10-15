import type { CatalogSnapshot } from "../native/contracts"
import type { ImportResult } from "./raw"

export type { ImportResult }

export interface CatalogGateway {
  load(): Promise<CatalogSnapshot | null>
  save(snapshot: CatalogSnapshot): Promise<void>
  importFiles(
    files: File[],
    onProgress?: (done: number, total: number) => void,
  ): Promise<ImportResult>
  reset(): Promise<void>
}
