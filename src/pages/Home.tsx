import { useCallback, useEffect, useState } from 'react'
import api, { getApiErrorMessage } from '../api/client'
import TokenTable, { type TokenRow } from '../components/TokenTable'

interface HomeApiResponse {
  response: {
    status: boolean
    message: string
    data: {
      stock_list: TokenRow[]
      crypto_list: TokenRow[]
      wishlist: TokenRow[]
    }
  }
}

const REFRESH_INTERVAL_SECONDS = 60

function Home() {
  const [stockList, setStockList] = useState<TokenRow[]>([])
  const [cryptoList, setCryptoList] = useState<TokenRow[]>([])
  const [wishlist, setWishlist] = useState<TokenRow[]>([])
  const [error, setError] = useState('')
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(REFRESH_INTERVAL_SECONDS)

  const fetchHomePageData = useCallback(async () => {
    try {
      setError('')

      const { data } = await api.get<HomeApiResponse>('/')

      if (!data.response.status) {
        throw new Error(data.response.message || 'Failed to fetch homepage data')
      }

      setStockList(data.response.data.stock_list ?? [])
      setCryptoList(data.response.data.crypto_list ?? [])
      setWishlist(data.response.data.wishlist ?? [])
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to fetch homepage data'))
    }
  }, [])

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
    <div className="container-fluid py-4 px-3 px-md-4">
      <div className="mb-4 d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
        <h1 className="display-6 fw-bold mb-0">TradingViewer</h1>
        <div className="fw-semibold text-muted">
          Time Before Refresh: {secondsUntilRefresh} seconds
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

        <div className="card shadow-sm border-0">
          <div className="card-header bg-dark text-white">Stocks</div>
          <div className="card-body p-0">
            <TokenTable tokens={stockList} fetchHomePageData={fetchHomePageData} />
          </div>
        </div>

        <div className="card shadow-sm border-0">
          <div className="card-header bg-primary text-white">Crypto</div>
          <div className="card-body p-0">
            <TokenTable tokens={cryptoList} fetchHomePageData={fetchHomePageData} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home