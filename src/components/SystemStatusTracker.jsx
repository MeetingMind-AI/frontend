/**
 * @file SystemStatusTracker.jsx
 * @description Real-time status indicator and diagnostics modal for Ollama and core platform services.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSystemStatus } from '../api'
import './SystemStatusTracker.css'

function CpuIcon({ size = 13, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  )
}

function ZapIcon({ size = 13, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function RefreshIcon({ size = 13, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function DatabaseIcon({ size = 13, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}

function ServerIcon({ size = 13, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  )
}

function LayersIcon({ size = 13, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
}

function MicIcon({ size = 13, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function CloseIcon({ size = 14, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * SystemStatusTracker Component:
 * Provides real-time infrastructure observability and hardware diagnostics.
 *
 * Metrics & Diagnostics Monitored:
 * 1. AI Inference Engine:
 *    - Runtime Mode: Host Native (Metal on macOS / CUDA on Linux/Windows) vs Docker GPU vs Docker CPU mode.
 *    - VRAM / RAM Detection: Scans running models for memory footprint and whether model layers
 *      are offloaded to GPU VRAM (size_vram > 0) vs host system RAM.
 *    - Model Availability: Verifies the configured LLM (e.g. hermes3:8b) is pulled and loaded.
 * 2. Ping Latency Measurements:
 *    - Captures round-trip ping time (in milliseconds) across all platform dependencies:
 *      Ollama LLM, PostgreSQL 15, Redis 7, Qdrant Vector DB, and Whisper Speech-to-Text.
 * 3. Polling & Visibility Throttling:
 *    - Periodically polls GET /api/system/status every 30 seconds.
 *    - Pauses network requests when document.visibilityState is 'hidden' to avoid background battery/network drain.
 * 4. Health Status Dot Tone Mapping:
 *    - Green ('status-dot--gpu'): Online with native host or GPU acceleration enabled.
 *    - Amber ('status-dot--cpu'): Online in CPU-only fallback mode (slower token generation).
 *    - Red ('status-dot--offline'): Service unreachable or error state.
 */
export default function SystemStatusTracker() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const modalRef = useRef(null)

  // Dispatches status fetch with error fallback keeping previous data intact
  const fetchStatus = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const data = await getSystemStatus()
      setStatus(data)
    } catch {
      setStatus((prev) => prev ? { ...prev, ok: false, ollama: { ...prev?.ollama, online: false } } : null)
    } finally {
      setLoading(false)
      if (isManual) setRefreshing(false)
    }
  }, [])

  // Polls every 30s only when the tab is currently active and visible to the user
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStatus()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const ollama = status?.ollama
  const isOnline = ollama?.online === true
  const isHost = ollama?.is_host === true || ollama?.instance_type === 'host' || ollama?.instance_type === 'mac_host'
  const isGpu = ollama?.is_gpu_accelerated === true

  // Status dot tone and label mapping based on online state and acceleration mode
  let dotClass = 'status-dot--offline'
  let statusText = 'AI: Offline'

  if (isOnline) {
    if (isHost) {
      dotClass = 'status-dot--gpu'
      statusText = 'Ollama: Host Engine'
    } else if (isGpu) {
      dotClass = 'status-dot--gpu'
      statusText = 'Ollama: Docker (GPU)'
    } else {
      dotClass = 'status-dot--cpu'
      statusText = 'Ollama: Docker (CPU)'
    }
  }

  return (
    <>
      <div className="status-tracker-wrap">
        <button
          type="button"
          className="status-tracker-badge"
          onClick={() => setIsOpen(true)}
          title="Click to view full system and inference diagnostics"
        >
          <span className={`status-dot ${dotClass}`} />
          <span className="status-tracker-icon">
            {isHost || isGpu ? <ZapIcon size={12} /> : <CpuIcon size={12} />}
          </span>
          <span className="status-tracker-label">{statusText}</span>
          {ollama?.latency_ms !== undefined && isOnline && (
            <span className="status-tracker-latency">{ollama.latency_ms}ms</span>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="status-modal-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className="status-modal"
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-modal-title"
          >
            <div className="status-modal-header">
              <div className="status-modal-title-group">
                <span className={`status-dot ${dotClass}`} />
                <h3 id="status-modal-title" className="status-modal-title">System & AI Infrastructure</h3>
              </div>
              <div className="status-modal-header-actions">
                <button
                  type="button"
                  className={`status-refresh-btn ${refreshing ? 'status-refresh-btn--spinning' : ''}`}
                  onClick={() => fetchStatus(true)}
                  disabled={refreshing}
                  title="Refresh status now"
                >
                  <RefreshIcon size={13} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  className="status-close-btn"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                >
                  <CloseIcon size={14} />
                </button>
              </div>
            </div>

            <div className="status-modal-body">
              {/* Ollama Section */}
              <section className="status-section">
                <div className="status-section-header">
                  <span className="status-section-label">AI Inference Engine</span>
                  <span className={`status-pill ${isOnline ? (isHost || isGpu ? 'status-pill--success' : 'status-pill--warning') : 'status-pill--danger'}`}>
                    {isOnline ? (ollama?.instance_label || (isHost ? 'Host Engine (Native)' : 'Docker CPU Mode')) : 'Unreachable'}
                  </span>
                </div>

                <div className="status-card">
                  <div className="status-card-row">
                    <span className="status-card-key">Deployment Target</span>
                    <span className="status-card-val status-mono">{ollama?.base_url || '—'}</span>
                  </div>
                  <div className="status-card-row">
                    <span className="status-card-key">Engine Version</span>
                    <span className="status-card-val status-mono">{ollama?.version ? `Ollama v${ollama.version}` : '—'}</span>
                  </div>
                  <div className="status-card-row">
                    <span className="status-card-key">Ping Latency</span>
                    <span className="status-card-val">{ollama?.latency_ms !== undefined ? `${ollama.latency_ms} ms` : '—'}</span>
                  </div>
                  <div className="status-card-row">
                    <span className="status-card-key">Configured Model</span>
                    <span className="status-card-val">
                      <span className="status-mono">{ollama?.configured_model || 'hermes3:8b'}</span>
                      {ollama?.model_available ? (
                        <span className="status-tag status-tag--ok">Installed</span>
                      ) : (
                        <span className="status-tag status-tag--warn">Not Found</span>
                      )}
                    </span>
                  </div>

                  {/* 
                    Loaded Models Breakdown:
                    Inspects models currently loaded into memory via Ollama's /api/ps.
                    Identifies memory footprint and checks if weights are mapped into GPU VRAM
                    (size_vram > 0) versus CPU system RAM.
                  */}
                  {ollama?.running_models && ollama.running_models.length > 0 && (
                    <div className="status-loaded-models">
                      <span className="status-sublabel">Models in Memory:</span>
                      <div className="status-model-chips">
                        {ollama.running_models.map((m) => (
                          <div key={m.name} className="status-model-chip">
                            <span className="status-mono">{m.name}</span>
                            <span className="status-chip-meta">
                              {formatBytes(m.size)}
                              {m.size_vram > 0 && ' • VRAM'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isHost && !isGpu && isOnline && (
                    <div className="status-notice">
                      <span className="status-notice-title">Hardware Acceleration Advisory</span>
                      <p className="status-notice-text">
                        Running in Docker CPU mode (~2 tokens/sec). On Apple Silicon (Metal) or Windows/Linux (NVIDIA CUDA), native or GPU-accelerated execution provides 10–20x faster generation. Start Ollama natively on host port 11434 and run <code>make app-up</code> to switch automatically.
                      </p>
                    </div>
                  )}

                  {ollama?.error && (
                    <div className="status-error-box">
                      <span className="status-mono">{ollama.error}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* 
                Core Infrastructure Diagnostics:
                Renders ping round-trip latency (ms) and operational health for each critical backing service:
                - PostgreSQL 15: Primary relational data store for meetings, transcripts, and team entities.
                - Redis 7: Ephemeral 60s TTL cache for Instant Clarity explanations.
                - Qdrant Vector DB: Semantic embeddings store for context retrieval and rag search.
                - Whisper STT: Speech-to-text inference engine generating real-time speaker transcripts.
              */}
              <section className="status-section">
                <span className="status-section-label">Core Infrastructure</span>
                <div className="status-services-grid">
                  <div className="status-service-item">
                    <div className="status-service-icon">
                      <DatabaseIcon size={14} />
                    </div>
                    <div className="status-service-meta">
                      <span className="status-service-name">PostgreSQL 15</span>
                      <span className="status-service-sub">
                        {status?.database?.latency_ms !== undefined ? `${status.database.latency_ms} ms` : '—'}
                      </span>
                    </div>
                    <span className={`status-dot ${status?.database?.online ? 'status-dot--gpu' : 'status-dot--offline'}`} />
                  </div>

                  <div className="status-service-item">
                    <div className="status-service-icon">
                      <ServerIcon size={14} />
                    </div>
                    <div className="status-service-meta">
                      <span className="status-service-name">Redis 7</span>
                      <span className="status-service-sub">
                        {status?.redis?.latency_ms !== undefined ? `${status.redis.latency_ms} ms` : '—'}
                      </span>
                    </div>
                    <span className={`status-dot ${status?.redis?.online ? 'status-dot--gpu' : 'status-dot--offline'}`} />
                  </div>

                  <div className="status-service-item">
                    <div className="status-service-icon">
                      <LayersIcon size={14} />
                    </div>
                    <div className="status-service-meta">
                      <span className="status-service-name">Qdrant Vector DB</span>
                      <span className="status-service-sub">
                        {status?.qdrant?.latency_ms !== undefined ? `${status.qdrant.latency_ms} ms` : '—'}
                      </span>
                    </div>
                    <span className={`status-dot ${status?.qdrant?.online ? 'status-dot--gpu' : 'status-dot--offline'}`} />
                  </div>

                  <div className="status-service-item">
                    <div className="status-service-icon">
                      <MicIcon size={14} />
                    </div>
                    <div className="status-service-meta">
                      <span className="status-service-name">Whisper STT</span>
                      <span className="status-service-sub">
                        {status?.stt?.latency_ms !== undefined ? `${status.stt.latency_ms} ms` : '—'}
                      </span>
                    </div>
                    <span className={`status-dot ${status?.stt?.online ? 'status-dot--gpu' : 'status-dot--offline'}`} />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
