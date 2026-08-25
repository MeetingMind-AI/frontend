import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getTeam, updateTeam, getMembers, kickMember, updateTeamMember,
  getTopics, createTopic, updateTopic, deleteTopic,
  getInviteLink, leaveTeam,
  getTeamPrompts, updateTeamPrompt, resetTeamPrompt,
} from '../api'
import { useAuth } from '../contexts/AuthContext'
import './Settings.css'

function initials(name) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const PROMPT_GROUPS = [
  {
    key: 'realtime',
    label: 'Real-time Monitoring',
    description: 'Runs on every utterance during a live meeting.',
    keys: ['realtime_scrum_master', 'realtime_user'],
  },
  {
    key: 'final_report',
    label: 'Final Report — Initial Analysis',
    description: 'Tech Lead and PM analyse the full transcript in parallel when the meeting ends.',
    keys: ['final_tech_lead', 'final_product_manager', 'initial_analysis_user'],
  },
  {
    key: 'discussion',
    label: 'Cross-functional Discussion',
    description: 'Tech Lead ↔ PM debate rounds that run after the initial analysis.',
    keys: ['discussion_tech_lead', 'discussion_product_manager', 'discussion_user'],
  },
  {
    key: 'synthesis',
    label: 'Final Synthesis',
    description: 'Scrum Master synthesises all findings into the master report.',
    keys: ['synthesis', 'synthesis_user'],
  },
  {
    key: 'instant_clarity',
    label: 'Instant Clarity',
    description: 'Triggered by the Explain Technical / Explain Business buttons during a live meeting.',
    keys: ['instant_clarity_technical', 'instant_clarity_business', 'instant_clarity_user'],
  },
]

const NOTIFICATION_TYPES = [
  { key: 'type:insight',     label: 'Insights',     icon: '💡', description: 'Real-time Scrum Master observations' },
  { key: 'type:to_do',      label: 'To Do',         icon: '✅', description: 'Action item proposals' },
  { key: 'type:parking_lot',label: 'Parking Lot',   icon: '🅿️', description: 'Parked discussion items' },
  { key: 'type:to_schedule', label: 'To Schedule',  icon: '📅', description: 'Items flagged for scheduling' },
  { key: 'type:blocker',    label: 'Blockers',      icon: '🚧', description: 'Blocker alerts' },
]

const TABS = [
  { key: 'general', label: 'General' },
  { key: 'members', label: 'Members' },
  { key: 'topics', label: 'Topics' },
  { key: 'prompts', label: 'AI Prompts', ownerOnly: true },
  { key: 'invite', label: 'Invite Link' },
  { key: 'leave', label: 'Leave Team' },
]

export default function Settings() {
  const { teamId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('general')
  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [topics, setTopics] = useState([])

  const [teamName, setTeamName] = useState('')
  const [nameError, setNameError] = useState('')
  const [nameSaving, setNameSaving] = useState(false)

  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)

  const [topicName, setTopicName] = useState('')
  const [topicColor, setTopicColor] = useState('#4f8ef7')
  const [topicError, setTopicError] = useState('')
  const [topicLoading, setTopicLoading] = useState(false)
  const [editingTopic, setEditingTopic] = useState(null)

  const [prompts, setPrompts] = useState([])
  const [promptDrafts, setPromptDrafts] = useState({})
  const [promptSaving, setPromptSaving] = useState({})
  const [promptsLoaded, setPromptsLoaded] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState(
    () => Object.fromEntries(PROMPT_GROUPS.map((g) => [g.key, true]))
  )

  const toggleGroup = (key) => setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }))

  useEffect(() => {
    getTeam(teamId).then((t) => { setTeam(t); setTeamName(t.name) }).catch(() => {})
    getMembers(teamId).then((data) => setMembers(data || [])).catch(() => {})
    getTopics(teamId).then((data) => setTopics(data.topics ?? [])).catch(() => {})
  }, [teamId])

  const isOwner = team && user && team.owner_id === user.id

  const handleSaveName = async (e) => {
    e.preventDefault()
    const name = teamName.trim()
    if (!name || name === team?.name) return
    setNameSaving(true)
    setNameError('')
    try {
      const t = await updateTeam(teamId, name)
      setTeam(t)
    } catch (err) {
      setNameError(err.message)
    } finally {
      setNameSaving(false)
    }
  }

  const handleKick = async (userId) => {
    try {
      await kickMember(teamId, userId)
      setMembers((prev) => prev.filter((m) => m.id !== userId))
    } catch (err) {
      alert(err.message)
    }
  }

  const handleUpdateMember = async (userId, updates) => {
    try {
      const updatedUser = await updateTeamMember(teamId, userId, updates)
      setMembers((prev) => prev.map((m) => m.id === userId ? updatedUser : m))
    } catch (err) {
      alert(err.message)
    }
  }

  const toggleNotificationPref = (m, pref) => {
    const current = m.notification_preferences || []
    const newPrefs = current.includes(pref) 
      ? current.filter(p => p !== pref)
      : [...current, pref]
    handleUpdateMember(m.id, { notification_preferences: newPrefs })
  }

  const handleGetInvite = async () => {
    try {
      const data = await getInviteLink(teamId)
      setInviteUrl(`${window.location.origin}/join/${data.invite_token}`)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleCopyInvite = () => {
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

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this team?')) return
    try {
      await leaveTeam(teamId)
      navigate('/teams')
    } catch (err) {
      alert(err.message)
    }
  }

  const handleCreateTopic = async (e) => {
    e.preventDefault()
    const name = topicName.trim()
    if (!name) return
    setTopicLoading(true)
    setTopicError('')
    try {
      const t = await createTopic(teamId, name, topicColor)
      setTopics((prev) => [...prev, t])
      setTopicName('')
    } catch (err) {
      setTopicError(err.message)
    } finally {
      setTopicLoading(false)
    }
  }

  const handleUpdateTopic = async (topicId) => {
    const name = editingTopic.name.trim()
    if (!name) return
    try {
      const t = await updateTopic(teamId, topicId, name, editingTopic.color)
      setTopics((prev) => prev.map((tp) => tp.id === topicId ? t : tp))
      setEditingTopic(null)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeleteTopic = async (topicId) => {
    if (!confirm('Delete this topic?')) return
    try {
      await deleteTopic(teamId, topicId)
      setTopics((prev) => prev.filter((t) => t.id !== topicId))
    } catch (err) {
      alert(err.message)
    }
  }

  const loadPrompts = async () => {
    try {
      const data = await getTeamPrompts(teamId)
      setPrompts(data.prompts)
      const drafts = {}
      data.prompts.forEach((p) => { drafts[p.key] = p.text })
      setPromptDrafts(drafts)
      setPromptsLoaded(true)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (tab === 'prompts' && !promptsLoaded) loadPrompts()
  }, [tab])

  const handleSavePrompt = async (key) => {
    setPromptSaving((s) => ({ ...s, [key]: true }))
    try {
      await updateTeamPrompt(teamId, key, promptDrafts[key])
      setPrompts((prev) => prev.map((p) => p.key === key ? { ...p, text: promptDrafts[key], is_custom: true } : p))
    } catch (err) {
      alert(err.message)
    } finally {
      setPromptSaving((s) => ({ ...s, [key]: false }))
    }
  }

  const handleResetPrompt = async (key) => {
    if (!confirm('Reset this prompt to the default?')) return
    try {
      await resetTeamPrompt(teamId, key)
      await loadPrompts()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleExportPrompts = () => {
    const customPrompts = prompts.filter(p => p.is_custom).map(p => ({ key: p.key, text: p.text }))
    const blob = new Blob([JSON.stringify(customPrompts, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meetingmind-prompts-${teamId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportPrompts = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result)
        if (!Array.isArray(imported)) throw new Error("Invalid format")
        let errorCount = 0
        for (const p of imported) {
          if (!p.key || !p.text) continue
          try {
            await updateTeamPrompt(teamId, p.key, p.text)
          } catch (err) {
            console.error("Failed to import", p.key, err)
            errorCount++
          }
        }
        await loadPrompts()
        alert(`Imported successfully${errorCount > 0 ? ` with ${errorCount} errors` : ''}.`)
      } catch (err) {
        alert("Failed to parse JSON file.")
      }
    }
    reader.readAsText(file)
    e.target.value = '' // Reset input
  }

  const handleResetAllPrompts = async () => {
    if (!confirm('Are you sure you want to reset ALL custom prompts back to their system defaults? This cannot be undone.')) return
    const customPrompts = prompts.filter(p => p.is_custom)
    let errorCount = 0
    for (const p of customPrompts) {
      try {
        await resetTeamPrompt(teamId, p.key)
      } catch (err) {
        console.error("Failed to reset", p.key, err)
        errorCount++
      }
    }
    await loadPrompts()
    if (errorCount > 0) alert(`Reset completed with ${errorCount} errors.`)
  }

  return (
    <div className="settings-page">
      <div className="page-header" style={{ marginBottom: '4px' }}>
        <div className="page-header-left">
          <h1 className="page-title">Team Settings</h1>
          <p className="page-sub">Manage team profile, members, topics, and prompts</p>
        </div>
      </div>

      <div className="settings-body">
        <aside className="settings-sidebar">
          {TABS.filter((t) => !t.ownerOnly || isOwner).map((t) => (
            <button
              key={t.key}
              className={`settings-tab ${tab === t.key ? 'settings-tab--active' : ''} ${t.key === 'leave' ? 'settings-tab--danger' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </aside>

        <div className="settings-content">
          {tab === 'general' && (
            <div>
              <h2 className="settings-section-title">General</h2>
              <form onSubmit={handleSaveName} className="settings-form">
                <label className="settings-label">Team Name</label>
                <input
                  className="settings-input"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  disabled={!isOwner}
                />
                {nameError && <p className="settings-error">{nameError}</p>}
                {isOwner && (
                  <button className="settings-save-btn" disabled={nameSaving || !teamName.trim()}>
                    {nameSaving ? 'Saving…' : 'Save'}
                  </button>
                )}
                {!isOwner && (
                  <p className="settings-hint">Only the team owner can rename the team.</p>
                )}
              </form>
            </div>
          )}

          {tab === 'members' && (
            <div>
              <h2 className="settings-section-title">Members</h2>
              <div className="settings-member-list">
                {members.map((m) => (
                  <div key={m.id} className="settings-member">
                    <div className="settings-member-avatar">
                      {m.photo_url
                        ? <img src={m.photo_url} alt={m.name} />
                        : <span>{initials(m.name)}</span>}
                    </div>
                    <div className="settings-member-info" style={{ flex: 1 }}>
                      <span className="settings-member-name">{m.name}</span>
                      <span className="settings-member-email">{m.email}</span>
                      {(m.id === user?.id || isOwner) && (
                        <div style={{ marginTop: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <label>
                            Role:
                            <select
                              value={m.role || 'member'}
                              disabled={!isOwner}
                              onChange={(e) => handleUpdateMember(m.id, { role: e.target.value })}
                              style={{ marginLeft: '4px', fontSize: '12px' }}
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                          </label>
                          {topics.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginLeft: '6px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Topics:</span>
                              {topics.map((t) => {
                                const isChecked = (m.notification_preferences || []).includes(t.name) || (m.notification_preferences || []).includes(String(t.id))
                                return (
                                  <label key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', cursor: 'pointer' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={() => toggleNotificationPref(m, t.name)}
                                    />
                                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: t.color }} />
                                    {t.name}
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      {/* ── Notification Types (admin-only control) ── */}
                      <div className="settings-notif-section">
                        <span className="settings-notif-section-label">
                          Live Notifications
                          {!isOwner && (
                            <span className="settings-notif-admin-badge">Admin only</span>
                          )}
                        </span>
                        <div className="settings-notif-types">
                          {NOTIFICATION_TYPES.map((nt) => {
                            const isChecked = !(m.notification_preferences || []).includes(`${nt.key}:off`)
                            // Only the owner can change notification types for any member
                            const canEdit = isOwner
                            return (
                              <label
                                key={nt.key}
                                className={`settings-notif-type-chip ${isChecked ? 'settings-notif-type-chip--on' : 'settings-notif-type-chip--off'} ${!canEdit ? 'settings-notif-type-chip--locked' : ''}`}
                                title={!canEdit ? 'Only admins can change notification types for members' : nt.description}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={!canEdit}
                                  onChange={() => {
                                    const prefs = m.notification_preferences || []
                                    const offKey = `${nt.key}:off`
                                    const newPrefs = isChecked
                                      ? [...prefs, offKey]
                                      : prefs.filter(p => p !== offKey)
                                    handleUpdateMember(m.id, { notification_preferences: newPrefs })
                                  }}
                                  style={{ display: 'none' }}
                                />
                                <span className="settings-notif-type-icon">{nt.icon}</span>
                                <span className="settings-notif-type-label">{nt.label}</span>
                                {isChecked ? (
                                  <span className="settings-notif-type-state">on</span>
                                ) : (
                                  <span className="settings-notif-type-state settings-notif-type-state--off">off</span>
                                )}
                              </label>
                            )
                          })}
                        </div>
                        {!isOwner && (
                          <p className="settings-hint" style={{ marginTop: '4px', fontSize: '11px' }}>
                            Only the team owner can manage notification types for members.
                          </p>
                        )}
                      </div>
                    </div>
                    {team && m.id === team.owner_id && (
                      <span className="settings-member-badge">Owner</span>
                    )}
                    {isOwner && m.id !== user.id && (
                      <button className="settings-kick-btn" onClick={() => handleKick(m.id)}>
                        Kick
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'topics' && (
            <div>
              <h2 className="settings-section-title">Topics</h2>
              {!isOwner && (
                <p className="settings-hint settings-hint--warn">Only the team owner can create, edit or delete topics.</p>
              )}
              {isOwner && (
                <form className="settings-topic-form" onSubmit={handleCreateTopic}>
                  <input
                    className="settings-input settings-input--sm"
                    placeholder="Topic name"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                  />
                  <input
                    type="color"
                    className="settings-color-input"
                    value={topicColor}
                    onChange={(e) => setTopicColor(e.target.value)}
                  />
                  <button className="settings-save-btn" disabled={topicLoading || !topicName.trim()}>
                    {topicLoading ? 'Adding…' : 'Add Topic'}
                  </button>
                  {topicError && <p className="settings-error">{topicError}</p>}
                </form>
              )}

              <div className="settings-topic-list">
                {topics.length === 0 && (
                  <p className="settings-empty">No topics yet.{isOwner ? ' Add one above to start tagging meetings.' : ''}</p>
                )}
                {topics.map((topic) => (
                  <div key={topic.id} className="settings-topic-item">
                    {isOwner && editingTopic?.id === topic.id ? (
                      <>
                        <input
                          className="settings-input settings-input--sm"
                          value={editingTopic.name}
                          onChange={(e) => setEditingTopic((p) => ({ ...p, name: e.target.value }))}
                          autoFocus
                        />
                        <input
                          type="color"
                          className="settings-color-input"
                          value={editingTopic.color}
                          onChange={(e) => setEditingTopic((p) => ({ ...p, color: e.target.value }))}
                        />
                        <button className="settings-save-btn settings-save-btn--sm" onClick={() => handleUpdateTopic(topic.id)}>
                          Save
                        </button>
                        <button className="settings-cancel-btn" onClick={() => setEditingTopic(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="settings-topic-dot" style={{ background: topic.color }} />
                        <span className="settings-topic-name">{topic.name}</span>
                        {isOwner && (
                          <>
                            <button
                              className="settings-topic-edit"
                              onClick={() => setEditingTopic({ id: topic.id, name: topic.name, color: topic.color })}
                            >
                              Edit
                            </button>
                            <button className="settings-topic-delete" onClick={() => handleDeleteTopic(topic.id)}>
                              Delete
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'prompts' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 className="settings-section-title" style={{ marginBottom: 0 }}>AI Prompts</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button className="settings-save-btn settings-save-btn--sm" style={{ display: 'inline-flex', alignItems: 'center', height: '32px', boxSizing: 'border-box' }} onClick={handleExportPrompts}>
                    Export JSON
                  </button>
                  <label className="settings-save-btn settings-save-btn--sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', height: '32px', boxSizing: 'border-box', margin: 0 }}>
                    Import JSON
                    <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportPrompts} />
                  </label>
                  <button className="settings-cancel-btn" onClick={handleResetAllPrompts} style={{ padding: '0 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', height: '32px', boxSizing: 'border-box', margin: 0 }}>
                    Reset All to Default
                  </button>
                </div>
              </div>
              <p className="settings-description">Customize the prompts sent to the AI for this team. Changes apply to all future meetings.</p>
              <div className="settings-prompt-list">
                {PROMPT_GROUPS.map((group) => {
                  const groupPrompts = group.keys.map((k) => prompts.find((p) => p.key === k)).filter(Boolean)
                  if (groupPrompts.length === 0) return null
                  const isOpen = expandedGroups[group.key]
                  return (
                    <div key={group.key} className="settings-prompt-group">
                      <button className="settings-prompt-group-header" onClick={() => toggleGroup(group.key)}>
                        <div className="settings-prompt-group-header-left">
                          <span className="settings-prompt-group-title">{group.label}</span>
                          <span className="settings-prompt-group-desc">{group.description}</span>
                        </div>
                        <span className={`settings-prompt-group-chevron${isOpen ? ' settings-prompt-group-chevron--open' : ''}`}>›</span>
                      </button>
                      {isOpen && (
                        <div className="settings-prompt-group-body">
                          {groupPrompts.map((p) => (
                            <div key={p.key} className="settings-prompt-card">
                              <div className="settings-prompt-header">
                                <span className="settings-prompt-label">{p.label}</span>
                                {p.readonly && <span className="settings-prompt-badge settings-prompt-badge--locked">Read-only</span>}
                                {!p.readonly && p.is_custom && <span className="settings-prompt-badge">Custom</span>}
                              </div>
                              {p.description && (
                                <p className="settings-prompt-description">{p.description}</p>
                              )}
                              {p.readonly ? (
                                <>
                                  <pre className="settings-prompt-readonly">{p.text}</pre>
                                  {p.variables && (
                                    <p className="settings-hint settings-hint--mono">
                                      Variables injetadas em runtime: <code>{p.variables}</code>
                                    </p>
                                  )}
                                </>
                              ) : (
                                <>
                                  <textarea
                                    className="settings-prompt-textarea"
                                    value={promptDrafts[p.key] ?? p.text}
                                    onChange={(e) => setPromptDrafts((d) => ({ ...d, [p.key]: e.target.value }))}
                                    rows={8}
                                  />
                                  <div className="settings-prompt-actions">
                                    <button
                                      className="settings-save-btn settings-save-btn--sm"
                                      disabled={promptSaving[p.key] || !promptDrafts[p.key]?.trim()}
                                      onClick={() => handleSavePrompt(p.key)}
                                    >
                                      {promptSaving[p.key] ? 'Saving…' : 'Save'}
                                    </button>
                                    {p.is_custom && (
                                      <button
                                        className="settings-cancel-btn"
                                        onClick={() => handleResetPrompt(p.key)}
                                      >
                                        Reset to default
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {tab === 'invite' && (
            <div>
              <h2 className="settings-section-title">Invite Link</h2>
              <p className="settings-description">Share this link with people you want to add to the team.</p>
              {!isOwner ? (
                <button className="settings-save-btn" disabled title="Only the team owner can generate invite links">
                  Generate Invite Link
                </button>
              ) : !inviteUrl ? (
                <button className="settings-save-btn" onClick={handleGetInvite}>
                  Generate Invite Link
                </button>
              ) : (
                <div className="settings-invite-row">
                  <input className="settings-input settings-input--mono" value={inviteUrl} readOnly />
                  <button className="settings-save-btn" onClick={handleCopyInvite}>
                    {inviteCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
              {!isOwner && (
                <p className="settings-hint settings-hint--warn" style={{ marginTop: '8px' }}>Only the team owner can generate invite links.</p>
              )}
            </div>
          )}

          {tab === 'leave' && (
            <div>
              <h2 className="settings-section-title">Leave Team</h2>
              {isOwner ? (
                <p className="settings-description settings-description--warn">
                  You are the owner of this team. Transfer ownership or delete the team before leaving.
                </p>
              ) : (
                <>
                  <p className="settings-description">
                    Leaving will remove you from this team. Your contributions are not deleted.
                  </p>
                  <button className="settings-danger-btn" onClick={handleLeave}>
                    Leave Team
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
