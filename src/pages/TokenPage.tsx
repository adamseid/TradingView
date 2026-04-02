import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { getApiErrorMessage } from '../api/client'

import TokenHistoryTable, { type TokenHistoryRow } from '../components/TokenHistoryTable'
import TradingViewWidget from '../components/TradingViewWidget'

interface StockDetailApiResponse {
  response: {
    status: boolean
    message: string
    data: {
      stock_data: TokenHistoryRow[]
    }
  }
}

function TokenPage() {
  const { ticker } = useParams<{ ticker: string }>()
  const [rows, setRows] = useState<TokenHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStockDetail = async () => {
      try {
        setLoading(true)
        setError('')

        const { data } = await api.get<StockDetailApiResponse>(`/token/${ticker}/`)

        if (!data.response.status) {
          throw new Error(data.response.message || 'Failed to fetch stock detail')
        }

        setRows(data.response.data.stock_data ?? [])
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Failed to fetch stock detail'))
      } finally {
        setLoading(false)
      }
    }

    if (ticker) {
      fetchStockDetail()
    }
  }, [ticker])

  const exchange = rows[0]?.exchange ?? ''
  const pageTitle = ticker?.toUpperCase() ?? 'Stock'

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      <div className="row justify-content-center">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
            <div>
              <h1 className="display-6 fw-bold mb-1">{pageTitle}</h1>
              <p className="text-muted mb-0">Historical score and indicator detail</p>
            </div>

            <div className="d-flex gap-2 align-items-center">
              {exchange && (
                <span className="badge text-bg-secondary">{exchange}</span>
              )}

              <Link to="/" className="btn btn-outline-dark">
                Return Home
              </Link>
            </div>
          </div>

          {loading && (
            <div className="card border-0 shadow-sm">
              <div className="card-body py-5 text-center">
                <div
                  className="spinner-border"
                  role="status"
                  aria-hidden="true"
                ></div>
                <p className="mt-3 mb-0 text-muted">Loading stock detail...</p>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="d-flex flex-column gap-4">
              <div className="card shadow-sm border-0 w-100">
                <div className="card-header bg-light fw-semibold">
                  {pageTitle} History
                </div>
                <div className="card-body p-0">
                  <TokenHistoryTable rows={rows} />
                </div>
              </div>

              <div className="card shadow-sm border-0 w-100">
                <div className="card-header bg-light fw-semibold">
                  TradingView Chart
                </div>
                <div className="card-body">
                  {ticker && exchange ? (
                    <TradingViewWidget
                      ticker={ticker.toUpperCase()}
                      exchange={exchange}
                    />
                  ) : (
                    <div className="text-muted">
                      No chart data available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TokenPage