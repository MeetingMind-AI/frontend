import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { joinTeam } from '../api'

export default function JoinTeam() {
  const { inviteToken } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    joinTeam(inviteToken)
      .then((data) => navigate(`/teams/${data.team_id}`, { replace: true, state: { welcome: data.team_name } }))
      .catch((err) => setError(err.message))
  }, [inviteToken])

  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', gap: '16px', color: 'var(--text-2)',
      }}>
        <p style={{ color: 'var(--red)', fontSize: '15px' }}>{error}</p>
        <button
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '13px' }}
          onClick={() => navigate('/teams')}
        >
          Go to Teams
        </button>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', color: 'var(--text-3)', fontSize: '15px',
    }}>
      Joining team…
    </div>
  )
}
