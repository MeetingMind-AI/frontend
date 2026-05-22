import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getTeam, updateTeam, getMembers, kickMember,
  getTopics, createTopic, updateTopic, deleteTopic,
  getInviteLink, leaveTeam,
} from '../api'
import { useAuth } from '../contexts/AuthContext'
import './Settings.css'

function initials(name) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const TABS = [
  { key: 'general', label: 'General' },
  { key: 'members', label: 'Members' },
  { key: 'topics', label: 'Topics' },
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

  useEffect(() => {
    getTeam(teamId).then((t) => { setTeam(t); setTeamName(t.name) }).catch(() => {})
    getMembers(teamId).then((data) => setMembers(data.members ?? [])).catch(() => {})
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

  return (
    <div className="settings-page">
      <div className="settings-top">
        <h1 className="settings-title">Team Settings</h1>
      </div>

      <div className="settings-body">
        <aside className="settings-sidebar">
          {TABS.map((t) => (
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
                    <div className="settings-member-info">
                      <span className="settings-member-name">{m.name}</span>
                      <span className="settings-member-email">{m.email}</span>
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
