/**
 * @file GlobalKanban.jsx
 * @description Global Kanban board page for managing team-wide action items across To Do, Doing, and Done columns.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getAllActions, getMembers, getMeetings, createAction, updateAction, deleteAction } from '../api'
import { buildKanbanTasks } from '../utils'
import './GlobalKanban.css'

/**
 * TaskCard component representing an individual Kanban task item.
 * Supports inline title editing, assignee selection, tag management, and column movement.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.task - Task data object.
 * @param {Array<Object>} props.members - List of team members for assignee dropdown.
 * @param {Function} props.onRefresh - Callback to refresh parent board state.
 */
function TaskCard({ task, members, onRefresh }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)


  const handleSaveTitle = async () => {
    setIsEditing(false)
    if (editTitle === task.title) return
    let prefix = ''
    if (task.kanban_status === 'doing') prefix = '[DOING] '
    else if (task.kanban_status === 'done') prefix = '[DONE] '
    else if (task.kanban_status === 'todo') prefix = '[TODO] '
    try {
      await updateAction(task.meetingId, task.id, undefined, `${prefix}${editTitle}`)
      onRefresh()
    } catch (err) {
      console.error(err)
    }
  }

  const toggleTag = async (tag) => {
    const newTags = task.tags.includes(tag) ? task.tags.filter(t => t !== tag) : [...task.tags, tag]
    try {
      await updateAction(task.meetingId, task.id, undefined, undefined, undefined, undefined, newTags)
      onRefresh()
    } catch (err) {
      console.error(err)
    }
  }
  const handleAssigneeChange = async (e) => {
    const newAssignee = e.target.value ? parseInt(e.target.value) : null
    try {
      await updateAction(task.meetingId, task.id, undefined, undefined, newAssignee)
      onRefresh()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this task?")) return
    try {
      await deleteAction(task.meetingId, task.id)
      onRefresh()
    } catch (err) {
      console.error(err)
    }
  }

  const handleArchive = async () => {
    try {
      await updateAction(task.meetingId, task.id, 'archived')
      onRefresh()
    } catch (err) {
      console.error(err)
    }
  }

  const handleMove = async (dir) => {
    let newStatus = ''
    if (task.kanban_status === 'todo' && dir === 'forward') newStatus = 'doing'
    else if (task.kanban_status === 'doing' && dir === 'forward') newStatus = 'done'
    else if (task.kanban_status === 'doing' && dir === 'back') newStatus = 'todo'
    else if (task.kanban_status === 'done' && dir === 'back') newStatus = 'doing'

    if (!newStatus) return

    let prefix = ''
    if (newStatus === 'doing') prefix = '[DOING] '
    else if (newStatus === 'done') prefix = '[DONE] '
    else if (newStatus === 'todo') prefix = '[TODO] '

    const newContent = `${prefix}${task.title}`
    
    try {
      await updateAction(task.meetingId, task.id, undefined, newContent)
      onRefresh()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="gk-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="gk-card-meeting">{task.meeting}</div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={handleArchive} className="gk-card-delete-btn" title="Archive Task">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </button>
          <button onClick={handleDelete} className="gk-card-delete-btn" title="Delete Task">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
      {isEditing ? (
        <input 
          value={editTitle} 
          onChange={e => setEditTitle(e.target.value)} 
          onBlur={handleSaveTitle}
          onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
          autoFocus
          style={{ width: '100%', padding: '4px', background: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }}
        />
      ) : (
        <p className="gk-card-title" onClick={() => setIsEditing(true)} style={{ cursor: 'pointer', outline: 'none' }} title="Click to edit">{task.title}</p>
      )}

      <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
        <button 
          onClick={() => toggleTag('technical')}
          style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer', background: task.tags.includes('technical') ? 'rgba(79, 142, 247, 0.2)' : 'transparent', color: task.tags.includes('technical') ? '#4f8ef7' : 'var(--text-dim)' }}
        >
          Tech
        </button>
        <button 
          onClick={() => toggleTag('business')}
          style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer', background: task.tags.includes('business') ? 'rgba(63, 185, 80, 0.2)' : 'transparent', color: task.tags.includes('business') ? '#3fb950' : 'var(--text-dim)' }}
        >
          Biz
        </button>
      </div>
      
      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {task.assignee?.photo_url ? (
            <img src={task.assignee.photo_url} alt="avatar" style={{ width: 24, height: 24, borderRadius: '50%' }} />
          ) : (
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
              {task.assignee?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <select 
            value={task.assignee?.id ?? ''} 
            onChange={handleAssigneeChange}
            style={{ flex: 1, background: 'transparent', color: 'var(--text-dim)', border: 'none', fontSize: '12px', cursor: 'pointer', outline: 'none' }}
          >
            <option value="">Unassigned</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
          <button 
            onClick={() => handleMove('back')}
            disabled={task.kanban_status === 'todo'}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: task.kanban_status === 'todo' ? 'not-allowed' : 'pointer' }}
          >
            &larr;
          </button>
          <span className="gk-card-date" style={{ margin: 0 }}>{task.meetingDate}</span>
          <button 
            onClick={() => handleMove('forward')}
            disabled={task.kanban_status === 'done'}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: task.kanban_status === 'done' ? 'not-allowed' : 'pointer' }}
          >
            &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GlobalKanban() {
  const { teamId } = useParams()
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [meetings, setMeetings] = useState([])

  const [showModal, setShowModal] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  const [newItemAssignee, setNewItemAssignee] = useState('')
  const [newItemMeeting, setNewItemMeeting] = useState('')
  const [filterTags, setFilterTags] = useState([])

  const toggleFilter = (tag) => setFilterTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  
  const filteredTasks = tasks.filter(t => {
    if (filterTags.length === 0) return true
    return filterTags.every(ft => t.tags.includes(ft))
  })

  const loadData = () => {
    getAllActions(teamId)
      .then((data) => setTasks(buildKanbanTasks(data)))
      .catch(() => {})
  }

  useEffect(() => {
    loadData()
    if (teamId) {
      getMembers(teamId).then(setMembers).catch(() => {})
      getMeetings(teamId).then(meets => {
        setMeetings(meets)
        if (meets.length > 0) setNewItemMeeting(meets[0].id)
      }).catch(() => {})
    }
  }, [teamId])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newItemMeeting || !newItemText.trim()) return
    try {
      await createAction(newItemMeeting, 'to_do', newItemText, newItemAssignee ? parseInt(newItemAssignee) : null)
      setShowModal(false)
      setNewItemText('')
      loadData()
    } catch (err) {
      console.error(err)
      alert('Failed to add task')
    }
  }

  const columns = [
    { id: 'todo', title: 'To-Do', color: 'var(--accent)' },
    { id: 'doing', title: 'In Progress', color: '#f5a623' },
    { id: 'done', title: 'Done', color: '#7ed321' }
  ]

  return (
    <div className="gk-page">
      <header className="gk-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="gk-title">Kanban</h1>
          <div className="gk-filters" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="gk-task-count">{filteredTasks.length} tasks</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                onClick={() => toggleFilter('technical')}
                style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer', background: filterTags.includes('technical') ? '#4f8ef7' : 'transparent', color: filterTags.includes('technical') ? '#fff' : 'var(--text-dim)' }}
              >
                Tech
              </button>
              <button 
                onClick={() => toggleFilter('business')}
                style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer', background: filterTags.includes('business') ? '#3fb950' : 'transparent', color: filterTags.includes('business') ? '#fff' : 'var(--text-dim)' }}
              >
                Biz
              </button>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ padding: '8px 16px', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Add Task
        </button>
      </header>

      {showModal && (
        <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Add Kanban Task</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Task content..." 
              value={newItemText} 
              onChange={e => setNewItemText(e.target.value)}
              style={{ padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px' }}
              required
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <select 
                value={newItemAssignee} 
                onChange={e => setNewItemAssignee(e.target.value)}
                style={{ flex: 1, padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px' }}
              >
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <select 
                value={newItemMeeting} 
                onChange={e => setNewItemMeeting(e.target.value)}
                style={{ flex: 1, padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px' }}
                required
              >
                {meetings.length === 0 && <option value="">No meetings available</option>}
                {meetings.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 16px', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
            </div>
          </form>
        </div>
      )}

      <div className="gk-board" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {columns.map(col => {
          const colTasks = filteredTasks.filter(t => t.kanban_status === col.id)
          return (
            <div key={col.id} className="gk-col">
              <div className="gk-col-header">
                <span className="gk-col-title" style={{ color: col.color }}>{col.title}</span>
                <span className="gk-col-count">{colTasks.length}</span>
              </div>
              <div className="gk-col-cards">
                {colTasks.length === 0 && (
                  <div className="gk-col-empty">No tasks</div>
                )}
                {colTasks.map((task) => (
                  <TaskCard key={task.id} task={task} members={members} onRefresh={loadData} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
