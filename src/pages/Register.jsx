import React, { useState } from 'react'
import {
  generateSecret, buildOtpAuthUri, buildQRUrl,
  verifyTOTP, hashPassword, saveAccount, accountExists
} from '../auth/totp'

const STEPS = ['credentials', 'scan', 'verify', 'done']

export default function Register({ onSwitchToLogin }) {
  const [step, setStep] = useState('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [secret, setSecret] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [otpUri, setOtpUri] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCredentials(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Email and password are required.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (accountExists(email)) { setError('An account with this email already exists.'); return }

    const newSecret = generateSecret()
    const uri = buildOtpAuthUri(newSecret, email)
    setSecret(newSecret)
    setOtpUri(uri)
    setQrUrl(buildQRUrl(uri))
    setStep('scan')
  }

  async function handleVerify(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const valid = await verifyTOTP(secret, token)
    setLoading(false)
    if (!valid) { setError('Invalid code. Make sure your authenticator app time is synced and try again.'); return }

    const pwHash = await hashPassword(password)
    saveAccount(email, pwHash, secret)
    setStep('done')
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div style={{ animation: 'slideUp 0.4s ease both', minHeight: 'calc(100vh - 140px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {['Account', 'Scan QR', 'Verify', 'Done'].map((label, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 3, borderRadius: 2, marginBottom: 6,
                background: i <= stepIndex ? 'var(--accent)' : 'var(--border)',
                transition: 'background 0.3s ease'
              }} />
              <span style={{ fontSize: '0.7rem', color: i <= stepIndex ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'Space Mono, monospace' }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Step 1: Credentials ── */}
        {step === 'credentials' && (
          <div className="panel">
            <div className="panel-title">Create Account</div>
            <form onSubmit={handleCredentials}>
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" />
              </div>
              <div className="field">
                <label>Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }}>
                Continue →
              </button>
            </form>
            <div style={{ marginTop: 20, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <span className="auth-link" onClick={onSwitchToLogin}>Sign in</span>
            </div>
          </div>
        )}

        {/* ── Step 2: Scan QR ── */}
        {step === 'scan' && (
          <div className="panel">
            <div className="panel-title">Set Up Google Authenticator</div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.7 }}>
              Open <strong style={{ color: 'var(--text)' }}>Google Authenticator</strong> (or Authy), tap the <strong style={{ color: 'var(--text)' }}>+</strong> button, then scan this QR code.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ padding: 12, background: '#fff', borderRadius: 12, display: 'inline-block' }}>
                <img src={qrUrl} alt="TOTP QR Code" width={180} height={180}
                  onError={e => { e.target.style.display = 'none' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Or enter this key manually
              </div>
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: '0.85rem', letterSpacing: '0.12em',
                background: 'var(--surface2)', padding: '10px 14px', borderRadius: 8,
                color: 'var(--accent2)', border: '1px solid var(--border)',
                wordBreak: 'break-all', userSelect: 'all'
              }}>
                {secret.match(/.{1,4}/g)?.join(' ')}
              </div>
            </div>

            <button className="btn btn-primary btn-full" onClick={() => { setToken(''); setStep('verify') }}>
              I've scanned it →
            </button>
          </div>
        )}

        {/* ── Step 3: Verify code ── */}
        {step === 'verify' && (
          <div className="panel">
            <div className="panel-title">Verify Your Code</div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.7 }}>
              Enter the 6-digit code shown in your authenticator app to confirm setup.
            </p>
            <form onSubmit={handleVerify}>
              <div className="field">
                <label>6-Digit Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={token}
                  onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3em', fontFamily: 'Space Mono, monospace' }}
                  autoFocus
                />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }} disabled={loading || token.length !== 6}>
                {loading ? 'Verifying…' : 'Verify & Create Account'}
              </button>
              <button type="button" className="btn btn-secondary btn-full" style={{ marginTop: 8 }} onClick={() => setStep('scan')}>
                ← Back
              </button>
            </form>
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === 'done' && (
          <div className="panel" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.2rem', marginBottom: 8 }}>
              Account Created!
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.7 }}>
              Your account <strong style={{ color: 'var(--accent2)' }}>{email}</strong> is ready.<br />
              You'll need your authenticator app every time you log in.
            </p>
            <button className="btn btn-primary" onClick={onSwitchToLogin}>
              Go to Sign In →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
