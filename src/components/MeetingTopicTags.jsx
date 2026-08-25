/**
 * @file MeetingTopicTags.jsx
 * @description Component for displaying, adding, and removing meeting topic chips and dropdown menus.
 */

import { useState, useEffect, useRef } from 'react'
import './MeetingTopicTags.css'

/**
 * TopicDropdown component.
 * Displays a dropdown list of available team topics allowing users to toggle topic assignments.
 * Automatically detects screen boundaries to open downwards or upwards without getting cropped.
 *
 * @param {Object} props - Component props.
 * @param {Array<Object>} props.teamTopics - List of team topics.
 * @param {Array<Object>} props.meetingTopics - List of topics currently assigned to the meeting.
 * @param {Function} props.onAdd - Callback when adding a topic.
 * @param {Function} props.onRemove - Callback when removing a topic.
 * @param {boolean} [props.dropUp=false] - Optional preference for opening upwards.
 */
function TopicDropdown({ teamTopics, meetingTopics, onAdd, onRemove, dropUp = false }) {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState(dropUp ? 'up' : 'down')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const estimatedHeight = Math.min(teamTopics.length * 36 + 12, 220)
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top

      // If near the top of the viewport or plenty of space below, open down
      if (spaceAbove < estimatedHeight + 20) {
        setPlacement('down')
      } else if (spaceBelow < estimatedHeight + 10 && spaceAbove >= estimatedHeight) {
        setPlacement('up')
      } else if (dropUp && spaceAbove >= estimatedHeight) {
        setPlacement('up')
      } else {
        setPlacement('down')
      }
    }
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, teamTopics.length, dropUp])

  if (teamTopics.length === 0) return null

  return (
    <div className="mm-topic-add-wrap" ref={ref}>
      <button className="mm-topic-add-btn" onClick={() => setOpen((v) => !v)} title="Add topic">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Topic
      </button>
      {open && (
        <div className={`mm-topic-dropdown mm-topic-dropdown--${placement}`}>
          {teamTopics.map((t) => {
            const isOn = meetingTopics.some((mt) => mt.id === t.id)
            return (
              <button
                key={t.id}
                className={`mm-topic-option ${isOn ? 'mm-topic-option--on' : ''}`}
                onClick={() => {
                  if (isOn) onRemove(t.id)
                  else onAdd(t.id, t)
                  setOpen(false)
                }}
              >
                <span className="mm-topic-option-dot" style={{ background: t.color }} />
                {t.name}
                {isOn && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: 'auto' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Main MeetingTopicTags component.
 * Renders topic chips with remove buttons and the TopicDropdown selector.
 *
 * @param {Object} props - Component props.
 * @param {Array<Object>} props.meetingTopics - Currently assigned topics.
 * @param {Array<Object>} props.teamTopics - All available team topics.
 * @param {Function} props.onAdd - Add topic handler.
 * @param {Function} props.onRemove - Remove topic handler.
 * @param {boolean} [props.dropUp=false] - Optional preference for opening upwards.
 */
export default function MeetingTopicTags({ meetingTopics, teamTopics, onAdd, onRemove, dropUp = false }) {
  if (meetingTopics.length === 0 && teamTopics.length === 0) return null

  return (
    <>
      {meetingTopics.map((t) => (
        <span
          key={t.id}
          className="mm-topic-chip"
          style={{ background: t.color + '22', color: t.color, borderColor: t.color + '55' }}
        >
          {t.name}
          <button
            className="mm-topic-chip-remove"
            onClick={() => onRemove(t.id)}
            title="Remove topic"
          >
            ×
          </button>
        </span>
      ))}
      <TopicDropdown
        teamTopics={teamTopics}
        meetingTopics={meetingTopics}
        onAdd={onAdd}
        onRemove={onRemove}
        dropUp={dropUp}
      />
    </>
  )
}

