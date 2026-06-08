import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api, { getApiErrorMessage } from '../api/client'

interface TickerSearchApiResponse {
  response: {
    status: boolean
    message: string
    data: {
      tickers: string[]
    }
  }
}

function AppNavbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const hideSuggestionsTimeoutRef = useRef<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [searchError, setSearchError] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    const normalizedQuery = query.trim()

    if (normalizedQuery.length < 1) {
      setSuggestions([])
      setSearchError('')
      setShowSuggestions(false)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setSearchError('')

        const { data } = await api.get<TickerSearchApiResponse>('/token/search/', {
          params: { q: normalizedQuery },
        })

        if (!data.response.status) {
          throw new Error(data.response.message || 'Failed to search tickers')
        }

        setSuggestions(data.response.data.tickers ?? [])
        setShowSuggestions((data.response.data.tickers ?? []).length > 0)
      } catch (error: unknown) {
        setSuggestions([])
        setSearchError(getApiErrorMessage(error, 'Failed to load ticker suggestions'))
        setShowSuggestions(false)
      }
    }, 150)

    return () => window.clearTimeout(timeoutId)
  }, [query])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    return () => {
      if (hideSuggestionsTimeoutRef.current !== null) {
        window.clearTimeout(hideSuggestionsTimeoutRef.current)
      }
    }
  }, [])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedQuery = query.trim().toUpperCase()
    if (!normalizedQuery) return

    navigate(`/token/${normalizedQuery}`)
    setQuery('')
    setSuggestions([])
    setSearchError('')
    setShowSuggestions(false)
  }

  const handleSuggestionSelect = (ticker: string) => {
    navigate(`/token/${ticker.toUpperCase()}`)
    setQuery('')
    setSuggestions([])
    setSearchError('')
    setShowSuggestions(false)
  }

  const handleInputFocus = () => {
    if (hideSuggestionsTimeoutRef.current !== null) {
      window.clearTimeout(hideSuggestionsTimeoutRef.current)
      hideSuggestionsTimeoutRef.current = null
    }

    if (suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleInputBlur = () => {
    hideSuggestionsTimeoutRef.current = window.setTimeout(() => {
      setShowSuggestions(false)
    }, 150)
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark border-bottom border-secondary-subtle">
      <div className="container-fluid px-3 px-md-4 d-flex flex-wrap align-items-start align-items-lg-center gap-3">
        <div className="d-flex d-lg-none align-items-center justify-content-between w-100">
          <Link className="navbar-brand fw-semibold mb-0" to="/">
            TradingViewer
          </Link>

          <button
            type="button"
            className="navbar-toggler"
            aria-label="Toggle navigation"
            aria-controls="mobile-navbar-links"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            <span className="navbar-toggler-icon"></span>
          </button>
        </div>

        <div className="d-none d-lg-flex align-items-center gap-4 flex-grow-1">
          <Link className="navbar-brand fw-semibold mb-0 me-2" to="/">
            TradingViewer
          </Link>

          <div className="navbar-nav flex-row flex-nowrap align-items-center gap-4">
            <Link
              to="/"
              className={`nav-link px-0 text-nowrap ${location.pathname === '/' ? 'active' : ''}`}
            >
              Home
            </Link>
            <Link
              to="/stocks/new"
              className={`nav-link px-0 text-nowrap ${location.pathname === '/stocks/new' ? 'active' : ''}`}
            >
              Add New Stock
            </Link>
            <Link
              to="/stocks/edit"
              className={`nav-link px-0 text-nowrap ${location.pathname === '/stocks/edit' ? 'active' : ''}`}
            >
              Edit Stock
            </Link>
          </div>
        </div>

        <form
          className="d-flex flex-column align-items-stretch w-100 mt-0 ms-lg-auto"
          onSubmit={submitSearch}
          style={{ width: '100%', maxWidth: '440px' }}
        >
          <div className="position-relative">
            <div className="input-group">
              <input
                type="search"
                className="form-control"
                placeholder="Search ticker"
                aria-label="Search ticker"
                value={query}
                onBlur={handleInputBlur}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={handleInputFocus}
                autoComplete="off"
              />
              <button type="submit" className="btn btn-outline-light">
                Search
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div
                className="position-absolute top-100 start-0 w-100 mt-1 bg-white border rounded shadow-sm overflow-auto"
                style={{ zIndex: 1050, maxHeight: '25rem' }}
              >
                {suggestions.map((ticker) => (
                  <button
                    key={ticker}
                    type="button"
                    className="btn btn-link w-100 text-start text-dark text-decoration-none rounded-0 px-3 py-2 border-0"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSuggestionSelect(ticker)}
                  >
                    {ticker}
                  </button>
                ))}
              </div>
            )}
          </div>

          {searchError && (
            <small className="text-danger mt-1">{searchError}</small>
          )}
        </form>

        {mobileMenuOpen && (
          <div
            id="mobile-navbar-links"
            className="navbar-nav d-lg-none w-100 mt-3 pt-2 border-top border-secondary-subtle"
          >
            <Link
              to="/"
              className={`nav-link px-0 ${location.pathname === '/' ? 'active' : ''}`}
            >
              Home
            </Link>
            <Link
              to="/stocks/new"
              className={`nav-link px-0 ${location.pathname === '/stocks/new' ? 'active' : ''}`}
            >
              Add New Stock
            </Link>
            <Link
              to="/stocks/edit"
              className={`nav-link px-0 ${location.pathname === '/stocks/edit' ? 'active' : ''}`}
            >
              Edit Stock
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}

export default AppNavbar
