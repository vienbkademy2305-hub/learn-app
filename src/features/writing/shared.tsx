"use client";
/** Pieces shared by the stroke-order guide and the character-writing exercise. */
import type { CharDataLoaderFn } from "hanzi-writer";
import { assetUrl } from "@/lib/storage-url";

export const WRITER_COLORS = {
  strokeColor: "#1c1917",
  outlineColor: "#d6d3d1",
  radicalColor: "#c73c27",
  highlightColor: "#e0513b",
  drawingColor: "#1f8a5b",
};

/** Loads self-hosted hanzi-writer-data through the storage URL resolver (never a CDN). */
export function strokeLoader(strokeKey: string): CharDataLoaderFn {
  return (_char, onLoad, onError) => {
    fetch(assetUrl(strokeKey))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(onLoad, onError);
  };
}

/** 米字格: the practice grid used in Chinese copybooks. */
export function WritingGrid() {
  return (
    <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
      <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke="#c73c27" strokeOpacity="0.45" />
      <g stroke="#c73c27" strokeOpacity="0.25" strokeDasharray="2 2" strokeWidth="0.5">
        <line x1="50" y1="0" x2="50" y2="100" />
        <line x1="0" y1="50" x2="100" y2="50" />
        <line x1="0" y1="0" x2="100" y2="100" />
        <line x1="100" y1="0" x2="0" y2="100" />
      </g>
    </svg>
  );
}
