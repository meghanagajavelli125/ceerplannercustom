import React, { useEffect, useState } from 'react'
import './App.css'
import Home from './pages/Home'
import LoginGenerate from './pages/LoginGenerate'
import ViewSchedule from './pages/ViewSchedule'
import About from './pages/About'

export default function App() {
  const [section, setSection] = useState('home')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState('')
  const [facultyList, setFacultyList] = useState([])
  const [generatedTimetableBlob, setGeneratedTimetableBlob] = useState(null)
  const [currentScheduleData, setCurrentScheduleData] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [savedTimetables, setSavedTimetables] = useState([])
  const [showActions, setShowActions] = useState(false)

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('savedTimetables') || '[]')
    setSavedTimetables(saved)
  }, [])

  const hasScheduleAccess = schedule.length > 0 || savedTimetables.length > 0

  function showSection(id) {
    if (id === 'timetable') {
      const saved = JSON.parse(localStorage.getItem('savedTimetables') || '[]')
      setSavedTimetables(saved)
    }
    setSection(id)
  }

  function assign(type, sectionNo, hours, day, slot, facList) {
    const available = facList.filter(f => {
      const rem = type === 'SIP' ? f.sipLoad : f.eepLoad
      const already = f.schedule?.[day] ?? []
      return rem >= hours && !already.includes(slot)
    })
    const shuffled = [...available].sort(() => Math.random() - 0.5)
    const mains = shuffled.filter(f => f.sno >= 1 && f.sno <= 13)
    const subs = shuffled.filter(f => f.sno > 13)
    let main, sub1, sub2
    if (mains.length >= 1 && subs.length >= 2) {
      main = mains[0]; sub1 = subs[0]; sub2 = subs[1]
    } else {
      const pick = shuffled.slice(0, 3)
      if (pick.length < 3) return null
      ;[main, sub1, sub2] = pick
    }
    ;[main, sub1, sub2].forEach(f => {
      if (!f.schedule[day]) f.schedule[day] = []
      f.schedule[day].push(slot)
      if (type === 'SIP') f.sipLoad -= hours
      else f.eepLoad -= hours
    })
    return {
      DAY: day.toUpperCase(),
      CLASS: `${type}-Sec${sectionNo}`,
      SESSION: slot,
      'FACULTY-1': main.name,
      'FACULTY-2': sub1.name,
      'FACULTY-3': sub2.name
    }
  }

  function generateTimetable(e) {
    if (e) e.preventDefault()
    const sipSections = parseInt(document.getElementById('sipCount').value) || 0
    const eepSections = parseInt(document.getElementById('eepCount').value) || 0
    if (sipSections === 0 && eepSections === 0) { alert('Both sections are 0. Nothing to generate.'); return }
    if (facultyList.length === 0) { alert('Please upload faculty data first.'); return }

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const SIP_SLOTS = ['10:10 - 12:10 PM', '1:00 - 3:00 PM']
    const EEP_SLOTS = ['9:10 - 12:10 PM', '12:10 - 4:00 PM (Lunch Break: 1:10 - 2:00 PM)']

    const facs = facultyList.map(f => ({ ...f, schedule: { ...f.schedule } }))
    facs.forEach(f => { f.sipLoad = Number(f.sipLoad); f.eepLoad = Number(f.eepLoad) })

    let result = [], sipAssigned = 0, eepAssigned = 0
    while ((sipAssigned < sipSections) || (eepAssigned < eepSections)) {
      let progress = false
      for (const day of DAYS) {
        if (sipAssigned < sipSections) {
          for (const slot of SIP_SLOTS) {
            if (sipAssigned >= sipSections) break
            const res = assign('SIP', sipAssigned + 1, 2, day, slot, facs)
            if (res) { result.push(res); sipAssigned++; progress = true }
          }
        }
        if (eepAssigned < eepSections) {
          for (const slot of EEP_SLOTS) {
            if (eepAssigned >= eepSections) break
            const res = assign('EEP', eepAssigned + 1, 3, day, slot, facs)
            if (res) { result.push(res); eepAssigned++; progress = true }
          }
        }
      }
      if (!progress) break
    }
    if (sipAssigned < sipSections || eepAssigned < eepSections) {
      alert(`Warning: Could only assign ${sipAssigned}/${sipSections} SIP and ${eepAssigned}/${eepSections} EEP sections.`)
    }
    setSchedule(result)
    setCurrentScheduleData(result)
    if (window.XLSX) {
      const ws = window.XLSX.utils.json_to_sheet(result, { header: ['DAY', 'CLASS', 'SESSION', 'FACULTY-1', 'FACULTY-2', 'FACULTY-3'] })
      const wb = window.XLSX.utils.book_new()
      window.XLSX.utils.book_append_sheet(wb, ws, 'Timetable')
      const wbout = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      setGeneratedTimetableBlob(new Blob([wbout], { type: 'application/octet-stream' }))
    }
    setSection('timetable')
    setShowActions(true)
  }

  function loadTimetable(id) {
    const saved = JSON.parse(localStorage.getItem('savedTimetables') || '[]')
    const t = saved.find(x => x.id === id)
    if (!t) return
    setSchedule(t.scheduleData)
    try {
      const binaryString = atob(t.data.split(',')[1])
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i)
      setGeneratedTimetableBlob(new Blob([bytes], { type: 'application/octet-stream' }))
    } catch (_) {}
    setCurrentScheduleData(t.scheduleData)
    setShowActions(true)
    window.scrollTo(0, 0)
  }

  function handleLogout() {
    setIsLoggedIn(false)
    setCurrentUser('')
  }

  return (
    <div>
      <header>
        <div className="header-logo">Schedule<span>Planner</span></div>
        <div className="header-status">
          <div className={`status-dot ${isLoggedIn ? '' : 'offline'}`} />
          {isLoggedIn ? currentUser : 'Not signed in'}
        </div>
      </header>

      <nav>
        <a href="#" className={section === 'home' ? 'active' : ''}
          onClick={(e) => { e.preventDefault(); showSection('home') }}>Home</a>

        <a href="#" className={section === 'login' ? 'active' : ''}
          onClick={(e) => { e.preventDefault(); showSection('login') }}>
          {isLoggedIn ? 'Generate' : 'Login & Generate'}
        </a>

        <a href="#"
          className={`${section === 'timetable' ? 'active' : ''} ${!hasScheduleAccess ? 'nav-locked' : ''}`}
          onClick={(e) => { e.preventDefault(); showSection('timetable') }}
          title={!hasScheduleAccess ? 'Generate or save a timetable first' : ''}>
          View Schedule {!hasScheduleAccess && <span className="nav-lock-icon">🔒</span>}
        </a>

        <a href="#" className={section === 'contact' ? 'active' : ''}
          onClick={(e) => { e.preventDefault(); showSection('contact') }}>About</a>
      </nav>

      <div className="container">
        {section === 'home' && <Home onNavigate={showSection} hasScheduleAccess={hasScheduleAccess} />}

        {section === 'login' && (
          <LoginGenerate
            isLoggedIn={isLoggedIn}
            onLogin={() => setIsLoggedIn(true)}
            onLogout={handleLogout}
            onGenerateTimetable={generateTimetable}
            onFacultyLoaded={setFacultyList}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
          />
        )}

        {section === 'timetable' && (
          <ViewSchedule
            schedule={schedule}
            showActions={showActions}
            hasScheduleAccess={hasScheduleAccess}
            generatedTimetableBlob={generatedTimetableBlob}
            currentScheduleData={currentScheduleData}
            savedTimetables={savedTimetables}
            setSavedTimetables={setSavedTimetables}
            onLoadTimetable={loadTimetable}
            onNavigate={showSection}
          />
        )}

        {section === 'contact' && <About />}
      </div>
    </div>
  )
}
