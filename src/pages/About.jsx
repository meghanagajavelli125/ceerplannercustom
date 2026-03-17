import React from 'react'

export default function About() {
  return (
    <div style={{ animation: 'slideUp 0.4s ease both' }}>
      <p className="page-title">About</p>
      <p className="page-subtitle">Schedule Planner helps you generate and manage faculty timetables.</p>

      <div className="panel">
        <div className="panel-title">Contact Support</div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.7 }}>
          Have a question or need assistance? Reach out and we'll get back to you as soon as possible.
        </p>
        <ul className="contact-list">
          <li>
            <span>📧</span>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 2 }}>Email</div>
              <a href="mailto:support@scheduleplanner.com" className="email">support@scheduleplanner.com</a>
            </div>
          </li>
          <li>
            <span>📍</span>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 2 }}>Available</div>
              <span style={{ fontSize: '0.9rem' }}>Mon – Fri, 9 AM – 6 PM</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  )
}
