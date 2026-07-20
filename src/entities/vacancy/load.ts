/** Загрузка датасета с прогрессом + предвычисления для поиска. */
import type { Dataset, DatasetMeta } from "./types";

export interface LoadedData {
  ds: Dataset;
  meta: DatasetMeta;
  /** нижний регистр «title + employer» для подстрочного поиска */
  searchIndex: string[];
}

export async function loadDataset(onProgress: (frac: number) => void): Promise<LoadedData> {
  const metaRes = await fetch("/data/meta.json");
  if (!metaRes.ok) throw new Error(`meta.json: HTTP ${metaRes.status}`);
  const meta = (await metaRes.json()) as DatasetMeta;

  const res = await fetch(meta.datasetUrl);
  if (!res.ok || !res.body) throw new Error(`dataset: HTTP ${res.status}`);

  // Прогресс по content-length нельзя (gzip) — считаем по meta.bytes (несжатый размер).
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onProgress(Math.min(0.95, received / meta.bytes));
  }
  const buf = new Uint8Array(received);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.byteLength;
  }
  const ds = JSON.parse(new TextDecoder().decode(buf)) as Dataset;
  onProgress(1);

  const searchIndex: string[] = new Array(ds.n);
  for (let i = 0; i < ds.n; i += 1) {
    searchIndex[i] = `${ds.cols.title[i]!} ${ds.dicts.employers[ds.cols.employerIdx[i]!]!}`.toLowerCase();
  }
  return { ds, meta, searchIndex };
}
