import React, { useRef, useState } from 'react'
import Register from './Register'
import { verifyTOTP, hashPassword, findAccount } from '../auth/totp'

export default function LoginGenerate({ isLoggedIn, onLogin, onLogout, onGenerateTimetable, onFacultyLoaded, currentUser, setCurrentUser }) {
  const fileInputRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [authView, setAuthView] = useState('login') // 'login' | 'register' | 'totp'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const account = findAccount(email)
    if (!account) { setError('No account found with this email.'); setLoading(false); return }

    const pwHash = await hashPassword(password)
    if (pwHash !== account.passwordHash) { setError('Incorrect password.'); setLoading(false); return }

    setLoading(false)
    setAuthView('totp') // password OK → now ask for TOTP
  }

  async function handleTOTP(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const account = findAccount(email)
    const valid = await verifyTOTP(account.totpSecret, token)
    setLoading(false)

    if (!valid) { setError('Invalid or expired code. Try again.'); return }

    setCurrentUser(email)
    onLogin()
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = function (ev) {
      try {
        const data = new Uint8Array(ev.target.result)
        const workbook = window.XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const json = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
        const parsed = json.map((row, idx) => ({
          sno: row.SNO ?? row.sno ?? row['S No'] ?? (idx + 1),
          name: row.Name ?? row.name ?? row.Faculty ?? `Faculty ${idx + 1}`,
          sipLoad: row.SIP ?? row.sipLoad ?? row.sip ?? 4,
          eepLoad: row.EEP ?? row.eepLoad ?? row.eep ?? 6,
          schedule: {}
        }))
        onFacultyLoaded(parsed)
        alert('Faculty data loaded successfully!')
      } catch (err) {
        console.error(err)
        alert('Failed to parse file. Make sure XLSX is loaded and file is valid.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // ── Logged in: show generate UI ──────────────────────────────────────────
  if (isLoggedIn) {
    return (
      <div style={{ animation: 'slideUp 0.4s ease both' }}>
        <div className="generate-title-row">
          <p className="page-title">Generate Timetable</p>
          <span className="badge badge-green">● {currentUser}</span>
        </div>
        <p className="page-subtitle">Upload faculty data and configure sections to generate a schedule.</p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className="generate-grid">
          <div className="panel">
            <div className="panel-title">Faculty Data</div>
            <div
              className={`file-upload-area ${fileName ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              <span className="file-upload-icon">{fileName ? '✅' : '📂'}</span>
              <div className="file-upload-text">
                {fileName ? 'File loaded — click to replace' : 'Click to upload faculty XLSX'}
              </div>
              {fileName && <div className="file-upload-name">{fileName}</div>}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">Section Configuration</div>
            <form onSubmit={onGenerateTimetable}>
              <div className="field-row">
                <div className="field">
                  <label>SIP Sections</label>
                  <input id="sipCount" defaultValue={2} type="number" min="0" />
                </div>
                <div className="field">
                  <label>EEP Sections</label>
                  <input id="eepCount" defaultValue={2} type="number" min="0" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full">
                Generate Timetable ⚡
              </button>
            </form>
          </div>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={() => { onLogout(); setAuthView('login'); setEmail(''); setPassword(''); setToken('') }} style={{ marginTop: 16 }}>
          Sign out
        </button>
      </div>
    )
  }

  // ── Register view ────────────────────────────────────────────────────────
  if (authView === 'register') {
    return <Register onSwitchToLogin={() => { setAuthView('login'); setError('') }} />
  }

  // ── TOTP verification step ───────────────────────────────────────────────
  if (authView === 'totp') {
    return (
      <div className="auth-center-wrap">
        <div className="auth-inner">
          <p className="page-title" style={{ textAlign: 'center' }}>Two-Factor Auth</p>
          <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: 32 }}>
            Enter the 6-digit code from your authenticator app.
          </p>
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                🔐
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Signing in as <strong style={{ color: 'var(--accent2)' }}>{email}</strong>
            </div>
            <form onSubmit={handleTOTP}>
              <div className="field">
                <label>Authenticator Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={token}
                  onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  style={{ textAlign: 'center', fontSize: '1.8rem', letterSpacing: '0.4em', fontFamily: 'Space Mono, monospace' }}
                  autoFocus
                />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }} disabled={loading || token.length !== 6}>
                {loading ? 'Verifying…' : 'Verify & Sign In'}
              </button>
              <button type="button" className="btn btn-secondary btn-full" style={{ marginTop: 8 }} onClick={() => { setAuthView('login'); setToken(''); setError('') }}>
                ← Back
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ── Login view ───────────────────────────────────────────────────────────
  return (
    <div style={{ animation: 'slideUp 0.4s ease both' }} className="auth-center-wrap">
      <div className="auth-inner">
        <p className="page-title" style={{ textAlign: 'center' }}>Sign In</p>
        <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: 32 }}>
          Access the timetable generator.
        </p>
        <div className="panel">
          <div className="panel-title">Admin Login</div>
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }} disabled={loading}>
              {loading ? 'Checking…' : 'Continue →'}
            </button>
          </form>
          <div style={{ marginTop: 20, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <span className="auth-link" onClick={() => { setAuthView('register'); setError('') }}>Create one</span>
          </div>
        </div>
      </div>
    </div>
  )
}
