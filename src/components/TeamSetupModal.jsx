/**
 * @file TeamSetupModal.jsx
 * @description First-time team enter setup modal for configuring workspace topics, notification preferences, and copying invite links.
 */

import { useState, useEffect } from 'react'
import { createTopic, updateTeamMember, getInviteLink, getTeam } from '../api'
import { useAuth } from '../contexts/AuthContext'
import './TeamSetupModal.css'

const DEFAULT_TOPIC_PRESETS = [
  { name: 'Sprint Planning', color: '#4f8ef7' },
  { name: 'Architecture', color: '#bc8cff' },
  { name: 'Daily Standup', color: '#d29922' },
  { name: 'Retrospective', color: '#f85149' },
  { name: 'Design Review', color: '#3fb950' },
  { name: 'Customer Demo', color: '#e3884c' },
]

/**
 * TeamSetupModal component.
 *
 * @param {Object} props
 * @param {string|number} props.teamId - Current team workspace ID.
 * @param {Object} [props.teamData] - Pre-fetched team record.
 * @param {Array} [props.existingTopics=[]] - Existing topics in the team.
 * @param {Function} props.onClose - Callback when setup is completed or skipped.
 * @param {Function} [props.onTopicsUpdated] - Callback to notify parent of newly created topics.
 */
export default function TeamSetupModal({
  teamId,
  teamData,
  existingTopics = [],
  onClose,
  onTopicsUpdated,
}) {
  const { user } = useAuth()
  const [team, setTeam] = useState(teamData || null)
  const [step, setStep] = useState(1) // 1: Topics & Workspace, 2: Notification Prefs, 3: Invite

  const [selectedTopics, setSelectedTopics] = useState(
    () => DEFAULT_TOPIC_PRESETS.map((t) => t.name)
  )
  const [prefTech, setPrefTech] = useState(true)
  const [prefBiz, setPrefBiz] = useState(true)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!team && teamId) {
      getTeam(teamId).then(setTeam).catch(() => {})
    }
  }, [team, teamId])

  useEffect(() => {
    if (teamId) {
      getInviteLink(teamId)
        .then((res) => {
          if (res?.invite_token) {
            setInviteUrl(`${window.location.origin}/join/${res.invite_token}`)
          }
        })
        .catch(() => {})
    }
  }, [teamId])

  const toggleTopic = (topicName) => {
    setSelectedTopics((prev) =>
      prev.includes(topicName)
        ? prev.filter((n) => n !== topicName)
        : [...prev, topicName]
    )
  }

  const handleCopyInvite = () => {
    if (!inviteUrl) return
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl)
    } else {
      const el = document.createElement('textarea')
      el.value = inviteUrl
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  const handleSaveAndFinish = async () => {
    setSaving(true)
    setError('')
    try {
      // 1. Create selected preset topics that don't exist yet
      const existingNames = new Set((existingTopics || []).map((t) => t.name.toLowerCase()))
      const createdList = []

      for (const preset of DEFAULT_TOPIC_PRESETS) {
        if (selectedTopics.includes(preset.name) && !existingNames.has(preset.name.toLowerCase())) {
          try {
            const newT = await createTopic(teamId, preset.name, preset.color)
            createdList.push(newT)
          } catch (e) {
            console.warn('[TeamSetup] topic create error:', e)
          }
        }
      }

      if (createdList.length > 0 && onTopicsUpdated) {
        onTopicsUpdated(createdList)
      }

      // 2. Update user team membership notification preferences
      if (user?.id && teamId) {
        const notifPrefs = []
        if (prefTech) notifPrefs.push('technical')
        if (prefBiz) notifPrefs.push('business')
        await updateTeamMember(teamId, user.id, { notification_preferences: notifPrefs }).catch(() => {})

        localStorage.setItem(`mm_team_setup_completed_${user.id}_${teamId}`, 'true')
      }

      onClose?.()
    } catch (err) {
      setError(err.message || 'Failed to finish team setup')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => {
    if (user?.id && teamId) {
      localStorage.setItem(`mm_team_setup_completed_${user.id}_${teamId}`, 'true')
    }
    onClose?.()
  }

  const teamDisplayName = team?.name || 'Your Team Workspace'

  return (
    <div className="tsm-backdrop" onClick={(e) => e.target === e.currentTarget && handleSkip()}>
      <div className="tsm-modal">
        {/* Header */}
        <div className="tsm-header">
          <div className="tsm-logo-wrap">
            <div className="tsm-team-avatar">
              {teamDisplayName[0]?.toUpperCase() || 'T'}
            </div>
            <div>
              <span className="tsm-brand">Team Setup: {teamDisplayName}</span>
              <span className="tsm-sub">Workspace Onboarding Wizard</span>
            </div>
          </div>
          <button className="tsm-close-btn" onClick={handleSkip} title="Skip setup">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="tsm-steps">
          <div
            className={`tsm-step-tab ${step === 1 ? 'tsm-step-tab--active' : ''} ${step > 1 ? 'tsm-step-tab--done' : ''}`}
            onClick={() => setStep(1)}
          >
            <span className="tsm-step-number">1</span>
            <span className="tsm-step-title">Topics & Tags</span>
          </div>
          <div
            className={`tsm-step-tab ${step === 2 ? 'tsm-step-tab--active' : ''} ${step > 2 ? 'tsm-step-tab--done' : ''}`}
            onClick={() => setStep(2)}
          >
            <span className="tsm-step-number">2</span>
            <span className="tsm-step-title">Notifications</span>
          </div>
          <div
            className={`tsm-step-tab ${step === 3 ? 'tsm-step-tab--active' : ''}`}
            onClick={() => setStep(3)}
          >
            <span className="tsm-step-number">3</span>
            <span className="tsm-step-title">Invite Team</span>
          </div>
        </div>

        {/* Body */}
        <div className="tsm-body">
          {error && <div className="tsm-error-alert">{error}</div>}

          {/* STEP 1: Default Meeting Topics */}
          {step === 1 && (
            <div className="tsm-step-content">
              <h2 className="tsm-step-heading">Enable Meeting Topics for this Team</h2>
              <p className="tsm-step-desc">
                Topics allow you to categorize past meetings, filter Kanban boards, and tag discussions. Select the categories you want enabled:
              </p>

              <div className="tsm-topics-grid">
                {DEFAULT_TOPIC_PRESETS.map((preset) => {
                  const isSelected = selectedTopics.includes(preset.name)
                  return (
                    <div
                      key={preset.name}
                      className={`tsm-topic-card ${isSelected ? 'tsm-topic-card--selected' : ''}`}
                      onClick={() => toggleTopic(preset.name)}
                    >
                      <div className="tsm-topic-dot" style={{ background: preset.color }} />
                      <span className="tsm-topic-name">{preset.name}</span>
                      <div className="tsm-topic-checkbox">
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Notification & Persona Preferences */}
          {step === 2 && (
            <div className="tsm-step-content">
              <h2 className="tsm-step-heading">Your Notification Settings in {teamDisplayName}</h2>
              <p className="tsm-step-desc">
                Configure which post-meeting digests and action item alerts you want to receive for this team:
              </p>

              <div className="tsm-checkbox-card" onClick={() => setPrefTech(!prefTech)}>
                <input type="checkbox" checked={prefTech} onChange={() => {}} />
                <div className="tsm-checkbox-info">
                  <span className="tsm-checkbox-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    Technical Insights & Architecture
                  </span>
                  <span className="tsm-checkbox-sub">Receive action item assignments tagged with engineering/technical focus.</span>
                </div>
              </div>

              <div className="tsm-checkbox-card" onClick={() => setPrefBiz(!prefBiz)}>
                <input type="checkbox" checked={prefBiz} onChange={() => {}} />
                <div className="tsm-checkbox-info">
                  <span className="tsm-checkbox-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--purple, #a855f7)' }}>
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    Product & Business Decisions
                  </span>
                  <span className="tsm-checkbox-sub">Receive action item assignments tagged with feature/business scope.</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Invite Link */}
          {step === 3 && (
            <div className="tsm-step-content">
              <h2 className="tsm-step-heading">Invite Teammates to Collaborate</h2>
              <p className="tsm-step-desc">
                Share this secure join link with colleagues to grant them access to this workspace:
              </p>

              <div className="tsm-invite-box">
                <input
                  type="text"
                  readOnly
                  className="tsm-invite-input"
                  value={inviteUrl || 'Generating invite link...'}
                />
                <button
                  type="button"
                  className={`tsm-copy-btn ${inviteCopied ? 'tsm-copy-btn--copied' : ''}`}
                  onClick={handleCopyInvite}
                  disabled={!inviteUrl}
                >
                  {inviteCopied ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="tsm-footer">
          {step > 1 ? (
            <button type="button" className="tsm-btn tsm-btn--ghost" onClick={() => setStep((s) => s - 1)}>
              ← Back
            </button>
          ) : (
            <button type="button" className="tsm-btn tsm-btn--ghost" onClick={handleSkip}>
              Skip Setup
            </button>
          )}

          {step < 3 ? (
            <button type="button" className="tsm-btn tsm-btn--primary" onClick={() => setStep((s) => s + 1)}>
              Next →
            </button>
          ) : (
            <button
              type="button"
              className="tsm-btn tsm-btn--primary"
              onClick={handleSaveAndFinish}
              disabled={saving}
            >
              {saving ? 'Saving Workspace…' : 'Complete Team Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
