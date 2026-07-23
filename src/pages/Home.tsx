import { useCallback, useEffect, useState } from 'react'
import api, { getApiErrorMessage } from '../api/client'
import AppNavbar from '../components/AppNavbar'
import TokenTable, { type TokenRow } from '../components/TokenTable'

interface HomeApiResponse {
  response: {
    status: boolean
    message: string
    data: {
      stock_list: Record<string, TokenRow[]>
      crypto_list: TokenRow[]
      wishlist: TokenRow[]
    }
  }
}

const REFRESH_INTERVAL_SECONDS = 60

function Home() {
  const [stockList, setStockList] = useState<Record<string, TokenRow[]>>({})
  const [cryptoList, setCryptoList] = useState<TokenRow[]>([])
  const [wishlist, setWishlist] = useState<TokenRow[]>([])
  const [error, setError] = useState('')
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(REFRESH_INTERVAL_SECONDS)
  const [selectedScore, setSelectedScore] = useState<'original_strategy_score' | 'macd_strategy_score'>('original_strategy_score')
  const [isRecalculating, setIsRecalculating] = useState(false)

  const fetchHomePageData = useCallback(async () => {
    try {
      setError('')

      const { data } = await api.get<HomeApiResponse>('/')

      if (!data.response.status) {
        throw new Error(data.response.message || 'Failed to fetch homepage data')
      }

      setStockList(data.response.data.stock_list ?? {})
      setCryptoList(data.response.data.crypto_list ?? [])
      setWishlist(data.response.data.wishlist ?? [])
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to fetch homepage data'))
    }
  }, [])

  const stockCategoryEntries = Object.entries(stockList)

  const handleRecalculate = async () => {
    if (isRecalculating) return

    try {
      setIsRecalculating(true)
      setError('')

      const { data } = await api.post('/token/recalculate-scores/', {
        score: selectedScore,
      })

      if (!data.response?.status) {
        throw new Error(data.response?.message || 'Failed to recalculate scores')
      }

      await fetchHomePageData()
      setSecondsUntilRefresh(REFRESH_INTERVAL_SECONDS)
    } catch (err: unknown) {
      const errorMessage = getApiErrorMessage(err, 'Failed to recalculate scores')

      if (errorMessage === 'Score recalculation job still running.') {
        window.alert(errorMessage)
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsRecalculating(false)
    }
  }

  useEffect(() => {
    let secondsLeft = REFRESH_INTERVAL_SECONDS

    void fetchHomePageData()
    setSecondsUntilRefresh(REFRESH_INTERVAL_SECONDS)

    const intervalId = window.setInterval(() => {
      secondsLeft -= 1

      if (secondsLeft <= 0) {
        void fetchHomePageData()
        secondsLeft = REFRESH_INTERVAL_SECONDS
      }

      setSecondsUntilRefresh(secondsLeft)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [fetchHomePageData])

  return (
    <>
      <AppNavbar />

      <div className="container-fluid py-4 px-3 px-md-4">
        <div className="mb-4 d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
          <div className="fw-semibold text-muted">
            Time Before Refresh: {secondsUntilRefresh} seconds
          </div>

          <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
            <select
              className="form-select"
              value={selectedScore}
              onChange={(event) =>
                setSelectedScore(event.target.value as 'original_strategy_score' | 'macd_strategy_score')
              }
              style={{ minWidth: '160px' }}
              disabled={isRecalculating}
            >
              <option value="original_strategy_score">Original Strategy Score</option>
              <option value="macd_strategy_score">MACD Strategy Score</option>
            </select>

            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => void handleRecalculate()}
              disabled={isRecalculating}
            >
              {isRecalculating ? 'Recalculating...' : 'Recalculate'}
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="d-flex flex-column gap-4">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-danger text-white">Wishlist</div>
            <div className="card-body p-0">
              <TokenTable tokens={wishlist} fetchHomePageData={fetchHomePageData} />
            </div>
          </div>

          {stockCategoryEntries.map(([category, tokens]) => (
            <div key={category} className="card shadow-sm border-0">
              <div className="card-header bg-dark text-white">{category} - Stocks</div>
              <div className="card-body p-0">
                <TokenTable tokens={tokens} fetchHomePageData={fetchHomePageData} />
              </div>
            </div>
          ))}

          <div className="card shadow-sm border-0">
            <div className="card-header bg-primary text-white">Crypto</div>
            <div className="card-body p-0">
              <TokenTable tokens={cryptoList} fetchHomePageData={fetchHomePageData} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Home


