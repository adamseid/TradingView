import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

function AuthPage() {
  const { loginUser, registerUser } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (mode === 'signup') {
        await registerUser(form)
      } else {
        await loginUser(form.email, form.password)
      }
    } catch (err: any) {
      setError(err?.response?.data?.response?.message || 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h1 className="h3 mb-3 text-center">TradingViewer</h1>

              <div className="d-flex gap-2 mb-4">
                <button
                  type="button"
                  className={`btn ${mode === 'signup' ? 'btn-dark' : 'btn-outline-dark'} flex-fill`}
                  onClick={() => setMode('signup')}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  className={`btn ${mode === 'login' ? 'btn-dark' : 'btn-outline-dark'} flex-fill`}
                  onClick={() => setMode('login')}
                >
                  Login
                </button>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <form onSubmit={onSubmit}>
                {mode === 'signup' && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">First name</label>
                      <input
                        name="first_name"
                        className="form-control"
                        value={form.first_name}
                        onChange={onChange}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Last name</label>
                      <input
                        name="last_name"
                        className="form-control"
                        value={form.last_name}
                        onChange={onChange}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={form.email}
                    onChange={onChange}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    name="password"
                    className="form-control"
                    value={form.password}
                    onChange={onChange}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-dark w-100"
                  disabled={submitting}
                >
                  {submitting ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Login'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage