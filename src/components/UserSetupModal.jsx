/**
 * @file UserSetupModal.jsx
 * @description First-time user login setup modal for customizing profile identity, avatar, role, and AI summary preferences.
 */

import { useState } from 'react'
import { updateMe } from '../api'
import { useAuth } from '../contexts/AuthContext'
import './UserSetupModal.css'

const ROLES = [
  'Software Engineer',
  'Tech Lead / Architect',
  'Product Manager',
  'Scrum Master / Agile Coach',
  'Engineering Manager',
  'Designer / UX Lead',
  'QA / Test Engineer',
  'Business Analyst',
  'Data Scientist',
  'Other',
]

/**
 * UserSetupModal component.
 *
 * @param {Object} props
 * @param {Function} props.onClose - Callback when modal is completed or closed.
 */
export default function UserSetupModal({ onClose }) {
  const { user, setUser } = useAuth()
  const [step, setStep] = useState(1) // 1: Profile, 2: Preferences, 3: Overview Tour

  const [name, setName] = useState(user?.name || '')
  const [role, setRole] = useState(() => localStorage.getItem(`mm_user_role_${user?.id}`) || 'Software Engineer')
  const [photoPreview, setPhotoPreview] = useState(user?.photo_url || null)
  const [photoB64, setPhotoB64] = useState(null)
  const [focusTech, setFocusTech] = useState(true)
  const [focusBiz, setFocusBiz] = useState(true)
  const [defaultClarity, setDefaultClarity] = useState('technical')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      setError('Photo must be smaller than 500 KB')
      return
    }
    setError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target.result
      setPhotoPreview(result)
      setPhotoB64(result.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    setPhotoB64('')
  }

  const handleSaveAndFinish = async () => {
    setSaving(true)
    setError('')
    try {
      if (name.trim() !== user?.name || photoB64 !== null) {
        const updatePayload = {}
        if (name.trim() && name.trim() !== user?.name) updatePayload.name = name.trim()
        if (photoB64 !== null) updatePayload.photoB64 = photoB64

        const res = await updateMe(updatePayload)
        if (res.user) {
          setUser(res.user)
        }
      }

      // Save client-side profile preferences
      if (user?.id) {
        localStorage.setItem(`mm_user_role_${user.id}`, role)
        localStorage.setItem(
          `mm_user_prefs_${user.id}`,
          JSON.stringify({ focusTech, focusBiz, defaultClarity })
        )
        localStorage.setItem(`mm_user_setup_completed_${user.id}`, 'true')
      }

      onClose?.()
    } catch (err) {
      setError(err.message || 'Failed to save profile setup')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => {
    if (user?.id) {
      localStorage.setItem(`mm_user_setup_completed_${user.id}`, 'true')
    }
    onClose?.()
  }

  return (
    <div className="usm-backdrop" onClick={(e) => e.target === e.currentTarget && handleSkip()}>
      <div className="usm-modal">
        {/* Modal Header */}
        <div className="usm-header">
          <div className="usm-logo-wrap">
            <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
              <polygon points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5" fill="none" stroke="#4f8ef7" strokeWidth="1.5" />
              <circle cx="10" cy="10" r="2.5" fill="#4f8ef7" />
            </svg>
            <span className="usm-brand">Welcome to MeetingMind</span>
          </div>
          <button className="usm-close-btn" onClick={handleSkip} title="Skip setup">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="usm-steps">
          <div className={`usm-step-tab ${step === 1 ? 'usm-step-tab--active' : ''} ${step > 1 ? 'usm-step-tab--done' : ''}`} onClick={() => setStep(1)}>
            <span className="usm-step-number">1</span>
            <span className="usm-step-title">Profile</span>
          </div>
          <div className={`usm-step-tab ${step === 2 ? 'usm-step-tab--active' : ''} ${step > 2 ? 'usm-step-tab--done' : ''}`} onClick={() => setStep(2)}>
            <span className="usm-step-number">2</span>
            <span className="usm-step-title">AI Preferences</span>
          </div>
          <div className={`usm-step-tab ${step === 3 ? 'usm-step-tab--active' : ''}`} onClick={() => setStep(3)}>
            <span className="usm-step-number">3</span>
            <span className="usm-step-title">Overview</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="usm-body">
          {error && <div className="usm-error-alert">{error}</div>}

          {/* STEP 1: Profile & Identity */}
          {step === 1 && (
            <div className="usm-step-content">
              <h2 className="usm-step-heading">Set up your account profile</h2>
              <p className="usm-step-desc">Customize how you appear to teammates across meeting transcripts and action items.</p>

              <div className="usm-avatar-row">
                <div className="usm-avatar-preview">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="usm-avatar-img" />
                  ) : (
                    <div className="usm-avatar-placeholder">
                      {name ? name.slice(0, 2).toUpperCase() : 'MM'}
                    </div>
                  )}
                </div>
                <div className="usm-avatar-controls">
                  <label className="usm-upload-btn">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Upload Avatar
                    <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                  </label>
                  {photoPreview && (
                    <button type="button" className="usm-remove-btn" onClick={handleRemovePhoto}>
                      Remove
                    </button>
                  )}
                  <span className="usm-field-hint">JPG or PNG (max 500 KB)</span>
                </div>
              </div>

              <div className="usm-field">
                <label className="usm-label">Display Name</label>
                <input
                  type="text"
                  className="usm-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <div className="usm-field">
                <label className="usm-label">Primary Role / Job Title</label>
                <select className="usm-select" value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* STEP 2: AI Preferences */}
          {step === 2 && (
            <div className="usm-step-content">
              <h2 className="usm-step-heading">Configure AI Assistant Preferences</h2>
              <p className="usm-step-desc">Choose which insights and summaries you want highlighted by default.</p>

              <div className="usm-pref-group">
                <label className="usm-label">Summary Perspectives</label>
                <div className="usm-checkbox-card" onClick={() => setFocusTech(!focusTech)}>
                  <input type="checkbox" checked={focusTech} onChange={() => {}} />
                  <div className="usm-checkbox-info">
                    <span className="usm-checkbox-title">🛠️ Technical Architecture & Decisions</span>
                    <span className="usm-checkbox-sub">Highlights code architecture, schema changes, and engineering blockers.</span>
                  </div>
                </div>

                <div className="usm-checkbox-card" onClick={() => setFocusBiz(!focusBiz)}>
                  <input type="checkbox" checked={focusBiz} onChange={() => {}} />
                  <div className="usm-checkbox-info">
                    <span className="usm-checkbox-title">📊 Product & Business Roadmap</span>
                    <span className="usm-checkbox-sub">Highlights customer requirements, UX topics, and timeline alignment.</span>
                  </div>
                </div>
              </div>

              <div className="usm-field" style={{ marginTop: '16px' }}>
                <label className="usm-label">Default Instant Clarity Explanation Mode</label>
                <div className="usm-radio-group">
                  <button
                    type="button"
                    className={`usm-radio-pill ${defaultClarity === 'technical' ? 'usm-radio-pill--active' : ''}`}
                    onClick={() => setDefaultClarity('technical')}
                  >
                    Tech Explanation (Engineer Focus)
                  </button>
                  <button
                    type="button"
                    className={`usm-radio-pill ${defaultClarity === 'business' ? 'usm-radio-pill--active' : ''}`}
                    onClick={() => setDefaultClarity('business')}
                  >
                    Business Explanation (Executive Focus)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Quick Tour / Overview */}
          {step === 3 && (
            <div className="usm-step-content">
              <h2 className="usm-step-heading">You are all set! Here's how MeetingMind works</h2>
              <p className="usm-step-desc">Your intelligent pair-programming and agile meeting partner.</p>

              <div className="usm-features-grid">
                <div className="usm-feature-card">
                  <div className="usm-feature-icon">🎙️</div>
                  <h4 className="usm-feature-title">Live ASR & Clarity</h4>
                  <p className="usm-feature-desc">Real-time meeting transcription with 1-click on-demand AI explanations.</p>
                </div>
                <div className="usm-feature-card">
                  <div className="usm-feature-icon">🤖</div>
                  <h4 className="usm-feature-title">Multi-Agent Debate</h4>
                  <p className="usm-feature-desc">Tech Lead and PM personas analyze tradeoffs and find alignment automatically.</p>
                </div>
                <div className="usm-feature-card">
                  <div className="usm-feature-icon">📋</div>
                  <h4 className="usm-feature-title">Agile Kanban Sync</h4>
                  <p className="usm-feature-desc">Approve or edit AI-extracted action items and parking lot topics in seconds.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="usm-footer">
          {step > 1 ? (
            <button type="button" className="usm-btn usm-btn--ghost" onClick={() => setStep((s) => s - 1)}>
              ← Back
            </button>
          ) : (
            <button type="button" className="usm-btn usm-btn--ghost" onClick={handleSkip}>
              Skip Setup
            </button>
          )}

          {step < 3 ? (
            <button type="button" className="usm-btn usm-btn--primary" onClick={() => setStep((s) => s + 1)}>
              Next →
            </button>
          ) : (
            <button
              type="button"
              className="usm-btn usm-btn--primary"
              onClick={handleSaveAndFinish}
              disabled={saving}
            >
              {saving ? 'Saving Profile…' : 'Complete Setup & Get Started'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
