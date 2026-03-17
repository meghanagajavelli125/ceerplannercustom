import React from 'react'

export default function Home({ onNavigate, hasScheduleAccess }) {
  return (
    <div style={{ animation: 'slideUp 0.4s ease both' }}>
      <p className="page-title">Schedule Planner</p>
      <p className="page-subtitle">Generate and manage faculty timetables with ease.</p>

      <div className="card-grid">
        <div className="card" onClick={() => onNavigate('login')} style={{ cursor: 'pointer' }}>
          <span className="card-icon">⚡</span>
          <div className="card-title">Generate Schedules</div>
          <div className="card-desc">Create optimized timetables for SIP and EEP sections with automated faculty assignment.</div>
        </div>

        <div
          className="card"
          onClick={() => hasScheduleAccess && onNavigate('timetable')}
          style={{ cursor: hasScheduleAccess ? 'pointer' : 'not-allowed', opacity: hasScheduleAccess ? 1 : 0.4 }}
          title={!hasScheduleAccess ? 'Generate a timetable first to unlock this' : ''}
        >
          <span className="card-icon">{hasScheduleAccess ? '📅' : '🔒'}</span>
          <div className="card-title">View Timetables</div>
          <div className="card-desc">
            {hasScheduleAccess
              ? 'Access, export, and manage all your generated and saved schedules in one place.'
              : 'Generate or save a timetable first to unlock this section.'}
          </div>
        </div>

        <div className="card" onClick={() => onNavigate('contact')} style={{ cursor: 'pointer' }}>
          <span className="card-icon">💬</span>
          <div className="card-title">Get Support</div>
          <div className="card-desc">Reach out to our team for help with any scheduling or usage questions.</div>
        </div>
      </div>
    </div>
  )
}
