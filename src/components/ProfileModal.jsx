/**
 * @file ProfileModal.jsx
 * @description Modal dialog for updating authenticated user profile details (display name and avatar photo).
 */

import { useState } from 'react'
import { updateMe } from '../api'
import { useAuth } from '../contexts/AuthContext'
import './ProfileModal.css'

/**
 * ProfileModal component.
 *
 * @param {Object} props
 * @param {Function} props.onClose - Callback invoked when the modal is closed.
 */
export default function ProfileModal({ onClose }) {
  const { user, setUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [photoPreview, setPhotoPreview] = useState(user?.photo_url || null)
  const [photoB64, setPhotoB64] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  const handleSave = async (e) => {
    e?.preventDefault?.()
    if (!name.trim()) {
      setError('Display name cannot be empty')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const payload = {}
      if (name.trim() !== user?.name) {
        payload.name = name.trim()
      }
      if (photoB64 !== null) {
        payload.photoB64 = photoB64
      }

      if (Object.keys(payload).length > 0) {
        const res = await updateMe(payload)
        if (res.user) {
          setUser(res.user)
        }
      }
      setSuccess('Profile updated successfully!')
      setTimeout(() => {
        onClose?.()
      }, 500)
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pm-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="pm-modal">
        <div className="pm-header">
          <div className="pm-title-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <h3 className="pm-title">Edit Profile</h3>
          </div>
          <button className="pm-close-btn" onClick={onClose} title="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="pm-body" onSubmit={handleSave}>
          {error && <div className="pm-alert pm-alert--error">{error}</div>}
          {success && <div className="pm-alert pm-alert--success">{success}</div>}

          <div className="pm-avatar-section">
            <div className="pm-avatar-preview">
              {photoPreview ? (
                <img src={photoPreview} alt="Avatar" className="pm-avatar-img" />
              ) : (
                <div className="pm-avatar-placeholder">
                  {name ? name.slice(0, 2).toUpperCase() : 'MM'}
                </div>
              )}
            </div>
            <div className="pm-avatar-controls">
              <label className="pm-upload-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload Photo
                <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              </label>
              {photoPreview && (
                <button type="button" className="pm-remove-btn" onClick={handleRemovePhoto}>
                  Remove
                </button>
              )}
              <span className="pm-hint">JPG or PNG (max 500 KB)</span>
            </div>
          </div>

          <div className="pm-field">
            <label className="pm-label">Display Name</label>
            <input
              type="text"
              className="pm-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>

          <div className="pm-field">
            <label className="pm-label">Email Address</label>
            <input
              type="email"
              className="pm-input pm-input--disabled"
              value={user?.email || ''}
              disabled
              title="Email cannot be changed"
            />
            <span className="pm-hint">Email is linked to your account authentication</span>
          </div>

          <div className="pm-footer">
            <button type="button" className="pm-btn pm-btn--ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="pm-btn pm-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
