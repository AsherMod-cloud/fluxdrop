import { Check, ChevronRight, Download, ExternalLink, FileAudio, FileImage, FileVideo, Play } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import type { MediaVariant, NormalizedDownload, SupportedPlatform } from "@shared/downloader";
import { getAvailableMediaModes, getMediaMode, getVariantsForMode, type MediaMode } from "@/lib/mediaModes";

const platformMeta: Record<SupportedPlatform, { label: string; short: string; color: string }> = {
  youtube: { label: "YouTube", short: "YT", color: "#ff4e64" },
  tiktok: { label: "TikTok", short: "TK", color: "#65f4ed" },
  instagram: { label: "Instagram", short: "IG", color: "#ff68b7" },
  facebook: { label: "Facebook", short: "FB", color: "#6e9fff" },
  x: { label: "X / Twitter", short: "X", color: "#f4f5f8" },
  douyin: { label: "Douyin", short: "DY", color: "#9c86ff" },
  threads: { label: "Threads", short: "TH", color: "#d4b6ff" },
};

function PlatformPill({ platform }: { platform: SupportedPlatform }) {
  const meta = platformMeta[platform];
  return <span className="platform-pill" style={{ "--platform-color": meta.color } as React.CSSProperties}><span>{meta.short}</span>{meta.label}</span>;
}

function MediaIcon({ type }: { type: MediaMode }) {
  if (type === "audio") return <FileAudio size={16} />;
  if (type === "image") return <FileImage size={16} />;
  return <FileVideo size={16} />;
}

type MediaResultCardProps = {
  result: NormalizedDownload;
  onDownload: (variant: MediaVariant) => void;
};

export function MediaResultCard({ result, onDownload }: MediaResultCardProps) {
  const variants = useMemo(() => result.variants, [result]);
  const availableModes = useMemo(() => getAvailableMediaModes(variants), [variants]);
  const [mediaMode, setMediaMode] = useState<MediaMode>(() => getMediaMode(variants[0] ?? { type: "video", quality: "", extension: "mp4", url: "" }));
  const groupedVariants = useMemo(() => getVariantsForMode(variants, mediaMode), [variants, mediaMode]);
  const [selectedUrl, setSelectedUrl] = useState(() => variants[0]?.url ?? "");
  const selectedVariant = groupedVariants.find((variant) => variant.url === selectedUrl) ?? groupedVariants[0];

  useEffect(() => {
    const firstMode = getMediaMode(variants[0] ?? { type: "video", quality: "", extension: "mp4", url: "" });
    setMediaMode(firstMode);
    setSelectedUrl(variants[0]?.url ?? "");
  }, [variants]);

  function selectMode(mode: MediaMode) {
    setMediaMode(mode);
    const first = getVariantsForMode(variants, mode)[0];
    if (first) setSelectedUrl(first.url);
  }

  return <div className="result-panel">
    <div className="result-preview"><img src={result.cover || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=900&q=80"} alt="Media thumbnail" /><div className="preview-overlay"><span><Play size={13} fill="currentColor" /> Preview</span><a href={result.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a></div></div>
    <div className="result-info"><div className="result-topline"><PlatformPill platform={result.platform} /><span className="result-found"><Check size={13} /> Media found</span></div><h3>{result.title}</h3>{result.caption && <p className="caption">{result.caption}</p>}<div className="mode-switch" role="tablist" aria-label="Media type">{availableModes.map((mode) => <button key={mode} className={mediaMode === mode ? "active" : ""} role="tab" aria-selected={mediaMode === mode} onClick={() => selectMode(mode)}>{mode === "video" ? <FileVideo size={14} /> : mode === "audio" ? <FileAudio size={14} /> : <FileImage size={14} />}{mode === "video" ? "Video / MP4" : mode === "audio" ? "Audio / MP3" : "Images"}</button>)}</div><div className="variant-label"><span>{mediaMode === "image" ? "Choose a slide" : "Choose a format"}</span><small>{groupedVariants.length} {mediaMode === "image" ? "slides available" : "options available"}</small></div><div className="variant-grid">{groupedVariants.map((variant, index) => { const type = getMediaMode(variant); const selected = selectedUrl === variant.url; return <button key={`${variant.url}-${variant.quality}`} className={`variant-option ${selected ? "selected" : ""}`} onClick={() => setSelectedUrl(variant.url)}><MediaIcon type={type} /><span><b>{type === "image" ? `Slide ${index + 1}` : variant.quality || type}</b><small>{variant.extension.toUpperCase()} · {type}</small></span>{selected && <Check size={15} />}</button>; })}</div><button className="download-button" onClick={() => selectedVariant && onDownload(selectedVariant)} disabled={!selectedVariant}><Download size={18} /> Download selected <ChevronRight size={17} /></button></div>
  </div>;
}
