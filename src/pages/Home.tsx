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

function Home() {
  const [stockList, setStockList] = useState<TokenRow[]>([])
  const [cryptoList, setCryptoList] = useState<TokenRow[]>([])
  const [wishlist, setWishlist] = useState<TokenRow[]>([])
  const [error, setError] = useState('')

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
    fetchHomePageData()

    const intervalId = window.setInterval(() => {
      fetchHomePageData()
    }, 60000)

    return () => window.clearInterval(intervalId)
  }, [fetchHomePageData])

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      <h1 className="display-6 fw-bold mb-4">TradingViewer</h1>

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