import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, signup } from '../api'
import { useAuth } from '../contexts/AuthContext'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [tab, setTab] = useState('login')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')
  const [signupPhoto, setSignupPhoto] = useState(null)
  const [signupError, setSignupError] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    try {
      const data = await login(loginEmail, loginPassword)
      setUser(data.user)
      navigate('/teams')
    } catch (err) {
      setLoginError(err.message)
    } finally {
      setLoginLoading(false)
    }
  }

  const handleSignupSubmit = async (e) => {
    e.preventDefault()
    setSignupLoading(true)
    setSignupError('')
    try {
      const data = await signup(signupEmail, signupName, signupPassword, signupConfirm, signupPhoto)
      setUser(data.user)
      navigate('/teams')
    } catch (err) {
      setSignupError(err.message)
    } finally {
      setSignupLoading(false)
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setSignupPhoto(ev.target.result.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <svg viewBox="0 0 20 20" fill="none" width="28" height="28">
            <polygon points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5" fill="none" stroke="#4f8ef7" strokeWidth="1.5" />
            <circle cx="10" cy="10" r="2.5" fill="#4f8ef7" />
          </svg>
          <span className="login-logo-text">MeetingMind</span>
        </div>

        <div className="login-tabs">
          <button
            className={`login-tab ${tab === 'login' ? 'login-tab--active' : ''}`}
            onClick={() => setTab('login')}
          >
            Sign In
          </button>
          <button
            className={`login-tab ${tab === 'signup' ? 'login-tab--active' : ''}`}
            onClick={() => setTab('signup')}
          >
            Sign Up
          </button>
        </div>

        {tab === 'login' && (
          <form className="login-form" onSubmit={handleLoginSubmit}>
            <label className="login-label">Email</label>
            <input
              className="login-input"
              type="email"
              autoComplete="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
            <label className="login-label">Password</label>
            <input
              className="login-input"
              type="password"
              autoComplete="current-password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
            {loginError && <p className="login-error">{loginError}</p>}
            <button className="login-submit" disabled={loginLoading}>
              {loginLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        {tab === 'signup' && (
          <form className="login-form" onSubmit={handleSignupSubmit}>
            <label className="login-label">Name</label>
            <input
              className="login-input"
              type="text"
              autoComplete="name"
              value={signupName}
              onChange={(e) => setSignupName(e.target.value)}
              required
            />
            <label className="login-label">Email</label>
            <input
              className="login-input"
              type="email"
              autoComplete="email"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              required
            />
            <label className="login-label">Password</label>
            <input
              className="login-input"
              type="password"
              autoComplete="new-password"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              required
            />
            <label className="login-label">Confirm Password</label>
            <input
              className="login-input"
              type="password"
              autoComplete="new-password"
              value={signupConfirm}
              onChange={(e) => setSignupConfirm(e.target.value)}
              required
            />
            <label className="login-label">
              Profile Photo <span className="login-optional">(optional)</span>
            </label>
            <input
              className="login-file"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />
            {signupError && <p className="login-error">{signupError}</p>}
            <button className="login-submit" disabled={signupLoading}>
              {signupLoading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
