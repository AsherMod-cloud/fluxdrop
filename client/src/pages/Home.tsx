import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  Github,
  History,
  Link2,
  LoaderCircle,
  Moon,
  Play,
  Radio,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { detectPlatform, SUPPORTED_PLATFORMS, type MediaVariant, type SupportedPlatform } from "@shared/downloader";
import { getMediaMode } from "@/lib/mediaModes";
import { MediaResultCard } from "@/components/MediaResultCard";

const platformMeta: Record<SupportedPlatform, { label: string; short: string; color: string }> = {
  youtube: { label: "YouTube", short: "YT", color: "#ff4e64" },
  tiktok: { label: "TikTok", short: "TK", color: "#65f4ed" },
  instagram: { label: "Instagram", short: "IG", color: "#ff68b7" },
  facebook: { label: "Facebook", short: "FB", color: "#6e9fff" },
  x: { label: "X / Twitter", short: "X", color: "#f4f5f8" },
  douyin: { label: "Douyin", short: "DY", color: "#9c86ff" },
  threads: { label: "Threads", short: "TH", color: "#d4b6ff" },
};

type HistoryItem = { id: string; url: string; platform: SupportedPlatform; mediaType: string; createdAt: number };

function getHistory() {
  try {
    const stored = localStorage.getItem("ryzumi-flux-history");
    return stored ? (JSON.parse(stored) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function PlatformPill({ platform }: { platform: SupportedPlatform }) {
  const meta = platformMeta[platform];
  return <span className="platform-pill" style={{ "--platform-color": meta.color } as React.CSSProperties}><span>{meta.short}</span>{meta.label}</span>;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof trpc.downloader.resolve.useMutation>>["data"]>(undefined);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const downloader = trpc.downloader.resolve.useMutation({
    onSuccess: (data) => {
      setInlineError("");
      setResult(data);
    },
    onError: (error) => {
      setInlineError(error.message);
      toast.error(error.message);
    },
  });

  useEffect(() => setHistory(getHistory()), []);

  const platform = useMemo(() => detectPlatform(url), [url]);

  function analyze() {
    setInlineError("");
    if (!url.trim()) {
      setInlineError("Paste a media link to begin.");
      return;
    }
    try {
      new URL(url.trim());
    } catch {
      setInlineError("That does not look like a valid URL. Include https:// and try again.");
      return;
    }
    if (!platform) {
      setInlineError("This platform is not supported yet. Try YouTube, TikTok, Instagram, Facebook, X, Douyin, or Threads.");
      return;
    }
    setResult(undefined);
    downloader.mutate({ url: url.trim() });
  }

  function downloadSelected(selectedVariant: MediaVariant) {
    if (!result) return;
    const item: HistoryItem = {
      id: crypto.randomUUID(), url: result.sourceUrl, platform: result.platform,
      mediaType: getMediaMode(selectedVariant), createdAt: Date.now(),
    };
    const next = [item, ...history.filter((entry) => entry.url !== item.url)].slice(0, 8);
    setHistory(next);
    localStorage.setItem("ryzumi-flux-history", JSON.stringify(next));
    window.open(selectedVariant.url, "_blank", "noopener,noreferrer");
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <nav className="topbar">
        <a className="brand" href="#top"><span className="brand-mark"><Sparkles size={17} /></span><span>FLUX<span className="brand-accent">DROP</span></span></a>
        <div className="nav-links"><a href="#how-it-works">How it works</a><a href="#history">History</a><a href="#api">API access</a></div>
        <div className="nav-actions"><button className="icon-button" aria-label="Toggle theme"><Moon size={17} /></button><button className="nav-cta" onClick={() => document.getElementById("download-input")?.focus()}>Start creating <ArrowUpRight size={15} /></button></div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="eyebrow"><span className="pulse-dot" /> Universal media extraction <span className="eyebrow-line" /> v1.0</motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }}>Turn any link<br /><span>into momentum.</span></motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .18 }}>A faster, cleaner way to collect the media that moves you. Paste a link from your favorite platform and let FluxDrop do the heavy lifting.</motion.p>
          <motion.div className={`url-input-wrap ${downloader.isPending ? "is-scanning" : ""}`} animate={downloader.isPending ? { boxShadow: ["0 0 0 0 rgba(255,82,185,.12)", "0 0 0 6px rgba(255,82,185,.12)", "0 0 0 0 rgba(255,82,185,.12)"] } : { boxShadow: "0 16px 45px rgba(0,0,0,.18)" }} transition={{ duration: 1.35, repeat: downloader.isPending ? Infinity : 0, ease: "easeInOut" }}>
            <div className="url-input-icon"><Link2 size={19} /></div>
            <input id="download-input" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => event.key === "Enter" && analyze()} placeholder="Paste a video, reel, post or short link..." aria-label="Media URL" />
            {platform && <PlatformPill platform={platform} />}
            <button className="paste-button" onClick={copyUrl} aria-label="Copy current URL">{copied ? <Check size={16} /> : <Copy size={16} />}</button>
            <button className="analyze-button" onClick={analyze} disabled={downloader.isPending}>{downloader.isPending ? <LoaderCircle className="spin" size={18} /> : <Search size={18} />}<span>{downloader.isPending ? "Scanning" : "Analyze"}</span></button>
          </motion.div>
          <AnimatePresence>{inlineError && <motion.div className="inline-error" role="alert" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}><span>!</span>{inlineError}</motion.div>}</AnimatePresence>
          <div className="trust-row"><div className="trust-avatars"><span>YT</span><span>TK</span><span>IG</span><span>+</span></div><span>Works with 7 platforms</span><span className="trust-divider" /><span><Zap size={13} /> No signup required</span></div>
        </div>

        <div className="hero-art" aria-label="FluxDrop media orb visualization">
          <div className="orb-grid" /><div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <motion.div className="liquid-orb" animate={{ rotate: [0, 7, -5, 0], y: [0, -9, 4, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}><div className="orb-shine" /><div className="orb-core"><Play size={30} fill="currentColor" /></div></motion.div>
          <motion.div className="floating-card card-top" animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity }}><span className="mini-icon"><Radio size={14} /></span><div><b>Signal found</b><small>Ready to extract</small></div><span className="status-live" /></motion.div>
          <motion.div className="floating-card card-bottom" animate={{ y: [0, 7, 0] }} transition={{ duration: 5, repeat: Infinity }}><div className="mini-bars"><i /><i /><i /><i /><i /></div><div><b>High quality</b><small>MP4 · 1080p</small></div><ArrowDownToLine size={15} /></motion.div>
          <div className="orbit-platforms">{SUPPORTED_PLATFORMS.map((item, index) => <span key={item} className={`orbit-icon orbit-icon-${index}`} style={{ "--platform-color": platformMeta[item].color } as React.CSSProperties}>{platformMeta[item].short}</span>)}</div>
        </div>
      </section>

      <section className="workspace" id="how-it-works">
        <div className="section-heading"><div><span className="section-kicker">LIVE WORKSPACE</span><h2>Your media, <em>unlocked.</em></h2></div><span className="workspace-status"><i /> System operational</span></div>
        <AnimatePresence mode="wait">
          {downloader.isPending && <motion.div key="loading" className="result-panel loading-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><div className="scan-lines" /><LoaderCircle className="spin large" size={35} /><h3>Reading the signal</h3><p>Resolving metadata and available media variants...</p></motion.div>}
          {!downloader.isPending && result && <motion.div key="result" initial={{ opacity: 0, y: 18, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 170, damping: 18 }}><MediaResultCard result={result} onDownload={downloadSelected} /></motion.div>}
          {!downloader.isPending && !result && <motion.div key="empty" className="empty-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="empty-orb"><Search size={24} /></div><h3>Nothing here yet.</h3><p>Paste a link above and your media workspace will appear here.</p></motion.div>}
        </AnimatePresence>
      </section>

      <section className="history-section" id="history"><div className="section-heading"><div><span className="section-kicker"><History size={13} /> RECENT ACTIVITY</span><h2>Pick up <em>where you left off.</em></h2></div><span className="history-count">{history.length} saved locally</span></div>{history.length === 0 ? <div className="history-empty"><Clock3 size={18} /> Your recent downloads will show up here.</div> : <div className="history-grid">{history.map((item) => <button className="history-item" key={item.id} onClick={() => setUrl(item.url)}><span className="history-platform" style={{ "--platform-color": platformMeta[item.platform].color } as React.CSSProperties}>{platformMeta[item.platform].short}</span><span className="history-detail"><b>{platformMeta[item.platform].label}</b><small>{item.mediaType} · {new Date(item.createdAt).toLocaleDateString()}</small></span><ArrowUpRight size={15} /></button>)}</div>}</section>

      <section className="api-strip" id="api"><div><span className="section-kicker">BUILT FOR THE CURIOUS</span><h2>One interface.<br /><em>Every possibility.</em></h2></div><p>FluxDrop is powered by a universal media layer so your workflow stays simple, even when the internet is not.</p><button className="outline-button">Explore the API <ArrowUpRight size={15} /></button></section>
      <footer><a className="brand" href="#top"><span className="brand-mark"><Sparkles size={15} /></span>FLUX<span className="brand-accent">DROP</span></a><span>Built for the open web · 2026</span><div><a href="#api"><Github size={16} /></a><a href="#top"><ArrowUpRight size={16} /></a></div></footer>
    </main>
  );
}
