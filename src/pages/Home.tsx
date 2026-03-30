import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
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

      const { data } = await axios.get<HomeApiResponse>('/api/', {
        withCredentials: true,
      })

      if (!data.response.status) {
        throw new Error(data.response.message || 'Failed to fetch homepage data')
      }

      setStockList(data.response.data.stock_list ?? [])
      setCryptoList(data.response.data.crypto_list ?? [])
      setWishlist(data.response.data.wishlist ?? [])
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.response?.message || err.message || 'Failed to fetch homepage data')
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Something went wrong')
      }
    } finally {
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

      {/* {loading && <div className="alert alert-secondary">Loading dashboard...</div>} */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* {!loading && !error && ( */}
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
      {/* )} */}
    </div>
  )
}

export default Home