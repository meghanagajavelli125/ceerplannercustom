import React, { useState } from 'react'

export default function ViewSchedule({
  schedule,
  showActions,
  hasScheduleAccess,
  generatedTimetableBlob,
  currentScheduleData,
  savedTimetables,
  setSavedTimetables,
  onLoadTimetable,
  onNavigate,
}) {
  if (!hasScheduleAccess) {
    return (
      <div className="auth-center-wrap">
        <div className="locked-overlay" style={{ maxWidth: 440 }}>
          <div className="locked-icon">🔒</div>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text)', marginBottom: 4 }}>
            No Timetables Yet
          </p>
          <p>Generate a timetable first, or load a previously saved one. Once you have at least one timetable, this section will unlock.</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 8 }}
            onClick={() => onNavigate('login')}
          >
            Go to Login & Generate →
          </button>
        </div>
      </div>
    )
  }
  const [showSaveDialogState, setShowSaveDialogState] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [renameId, setRenameId] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  function renderPreviewHTML(scheduleData) {
    const grouped = scheduleData.reduce((acc, row) => {
      acc[row.DAY] = acc[row.DAY] || []
      acc[row.DAY].push(row)
      return acc
    }, {})
    let html = ''
    for (const day in grouped) {
      html += `<div style="margin-bottom:8px"><strong style="color:#6c63ff;font-size:0.78rem">${day}</strong></div>`
      html += `<table style="width:100%;font-size:0.76rem;border-collapse:collapse">`
      html += `<tr><th style="text-align:left;padding:4px 6px;color:#7a7a9a">Class</th><th style="text-align:left;padding:4px 6px;color:#7a7a9a">Session</th><th style="text-align:left;padding:4px 6px;color:#7a7a9a">F1</th><th style="text-align:left;padding:4px 6px;color:#7a7a9a">F2</th><th style="text-align:left;padding:4px 6px;color:#7a7a9a">F3</th></tr>`
      grouped[day].forEach(r => {
        html += `<tr><td style="padding:4px 6px;color:#e8e8f0">${r.CLASS}</td><td style="padding:4px 6px;color:#e8e8f0">${r.SESSION}</td><td style="padding:4px 6px;color:#e8e8f0">${r['FACULTY-1']}</td><td style="padding:4px 6px;color:#e8e8f0">${r['FACULTY-2']}</td><td style="padding:4px 6px;color:#e8e8f0">${r['FACULTY-3']}</td></tr>`
      })
      html += `</table><hr style="border-color:rgba(255,255,255,0.06);margin:8px 0">`
    }
    return html
  }

  function renderTimetableHTML() {
    if (!schedule || schedule.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p>No timetable generated yet.<br />Go to Login & Generate to create one.</p>
        </div>
      )
    }
    const grouped = schedule.reduce((acc, row) => {
      acc[row.DAY] = acc[row.DAY] || []
      acc[row.DAY].push(row)
      return acc
    }, {})
    return Object.keys(grouped).map(day => (
      <div key={day} className="day-section">
        <div className="day-label">{day}</div>
        <table>
          <thead>
            <tr>
              <th>Class</th><th>Session</th><th>Faculty 1</th><th>Faculty 2</th><th>Faculty 3</th>
            </tr>
          </thead>
          <tbody>
            {grouped[day].map((r, i) => (
              <tr key={i}>
                <td>
                  <span className={`class-pill ${r.CLASS.startsWith('SIP') ? 'class-sip' : 'class-eep'}`}>
                    {r.CLASS}
                  </span>
                </td>
                <td>{r.SESSION}</td>
                <td>{r['FACULTY-1']}</td>
                <td>{r['FACULTY-2']}</td>
                <td>{r['FACULTY-3']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ))
  }

  function exportToExcel() {
    if (!generatedTimetableBlob) { alert('No timetable generated to export.'); return }
    const url = URL.createObjectURL(generatedTimetableBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'final_timetable_output.xlsx'
    link.click()
  }

  function showSaveDialog() {
    setSaveName(`Timetable ${new Date().toLocaleString()}`)
    setShowSaveDialogState(true)
  }

  function hideSaveDialog() {
    setShowSaveDialogState(false)
    setSaveName('')
  }

  function saveTimetable() {
    const name = saveName.trim()
    if (!name) { alert('Please enter a name.'); return }
    if (!generatedTimetableBlob || !currentScheduleData) { alert('No timetable to save'); return }
    const reader = new FileReader()
    reader.readAsDataURL(generatedTimetableBlob)
    reader.onloadend = function () {
      const timetableData = {
        id: Date.now(),
        name,
        data: reader.result,
        preview: renderPreviewHTML(currentScheduleData),
        scheduleData: currentScheduleData,
        timestamp: new Date().toISOString()
      }
      const saved = JSON.parse(localStorage.getItem('savedTimetables') || '[]')
      saved.push(timetableData)
      localStorage.setItem('savedTimetables', JSON.stringify(saved))
      setSavedTimetables(saved)
      hideSaveDialog()
      alert('Timetable saved!')
    }
  }

  function exportSavedTimetable(id) {
    const saved = JSON.parse(localStorage.getItem('savedTimetables') || '[]')
    const t = saved.find(x => x.id === id)
    if (!t) return
    try {
      const binaryString = atob(t.data.split(',')[1])
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${t.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`
      link.click()
    } catch (err) { console.error(err) }
  }

  function confirmRename(id) {
    const newName = renameValue.trim()
    if (!newName) { alert('Please enter a name.'); return }
    const saved = JSON.parse(localStorage.getItem('savedTimetables') || '[]')
    const idx = saved.findIndex(t => t.id === id)
    if (idx !== -1) {
      saved[idx].name = newName
      localStorage.setItem('savedTimetables', JSON.stringify(saved))
      setSavedTimetables(saved.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)))
      setRenameId(null)
      setRenameValue('')
    }
  }

  function deleteTimetable(id) {
    if (!confirm('Delete this timetable?')) return
    let saved = JSON.parse(localStorage.getItem('savedTimetables') || '[]')
    saved = saved.filter(t => t.id !== id)
    localStorage.setItem('savedTimetables', JSON.stringify(saved))
    setSavedTimetables(saved.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)))
  }

  return (
    <div style={{ animation: 'slideUp 0.4s ease both' }}>
      <div className="timetable-header">
        <div>
          <p className="page-title">Schedule</p>
          <p className="page-subtitle">View and manage generated timetables.</p>
        </div>
        {showActions && (
          <div className="action-bar">
            <button className="btn btn-secondary btn-sm" onClick={exportToExcel}>↓ Export XLSX</button>
            <button className="btn btn-primary btn-sm" onClick={showSaveDialog}>Save</button>
          </div>
        )}
      </div>

      <div className="panel">
        {renderTimetableHTML()}
      </div>

      {showSaveDialogState && (
        <div className="save-dialog">
          <h4>Save Timetable</h4>
          <div className="rename-row">
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Enter a name…"
            />
            <button className="btn btn-primary btn-sm" onClick={saveTimetable}>Save</button>
            <button className="btn btn-secondary btn-sm" onClick={hideSaveDialog}>Cancel</button>
          </div>
        </div>
      )}

      <div className="divider" />

      <div style={{ marginBottom: 16 }}>
        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>
          Saved Timetables
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {savedTimetables.length} saved
        </p>
      </div>

      {savedTimetables.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🗂️</div>
          <p>No saved timetables yet.</p>
        </div>
      ) : (
        <div className="saved-list">
          {savedTimetables.map(t => (
            <div key={t.id} className="saved-item">
              <div className="saved-item-header">
                <span className="saved-item-title">{t.name}</span>
                <span className="badge badge-purple">saved</span>
              </div>
              <div className="saved-item-meta">{new Date(t.timestamp).toLocaleString()}</div>
              <div className="timetable-preview" dangerouslySetInnerHTML={{ __html: t.preview }} />
              <div className="saved-item-actions">
                <button className="btn btn-success btn-sm" onClick={() => onLoadTimetable(t.id)}>Load</button>
                <button className="btn btn-secondary btn-sm" onClick={() => exportSavedTimetable(t.id)}>Export</button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setRenameId(t.id); setRenameValue(t.name) }}>Rename</button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteTimetable(t.id)}>Delete</button>
              </div>
              {renameId === t.id && (
                <div className="rename-row">
                  <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="New name…" />
                  <button className="btn btn-primary btn-sm" onClick={() => confirmRename(t.id)}>OK</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setRenameId(null); setRenameValue('') }}>Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
