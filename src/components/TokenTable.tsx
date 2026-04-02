import { useRef } from 'react'
import api from '../api/client'
import { Link } from 'react-router-dom'

export interface TokenRow {
  stock_id: number
  wishlist: number
  ticker: string
  exchange: string
  total_score: number | null
  current_price: number | null
  daily_profit: number | null
  daily_return: number | null
  support_resistance_score: number | null
  kinematics_score: number | null
  five_day_velocity_score: number | null
  five_day_acceleration_score: number | null
  daily_macd_score: number | null
  daily_macd_velocity: number | null
  weekly_macd_score: number | null
  weekly_macd_velocity: number | null
  ma_score: number | null
  ma_50d_score: number | null
  ma_100d_score: number | null
  ma_200d_score: number | null
}

interface TokenTableProps {
  tokens: TokenRow[]
  fetchHomePageData: () => Promise<void>
}

function formatValue(value: number | null, prefix = '') {
  if (value === null || value === undefined) return '-'
  return `${prefix}${value}`
}

function TokenTable({ tokens, fetchHomePageData }: TokenTableProps) {
  const touchedRef = useRef(false)

  const handleWishlistClick = async (stockId: number) => {
    try {
      await api.post('/token/wishlist/toggle/', { stock_id: stockId })
    } catch (error) {
      console.error('Failed to toggle wishlist', error)
    } finally {
      await fetchHomePageData()
    }
  }

  const handleWishlistTouchStart = async (stockId: number) => {
    touchedRef.current = true
    await handleWishlistClick(stockId)

    window.setTimeout(() => {
      touchedRef.current = false
    }, 500)
  }

  const handleWishlistButtonClick = async (stockId: number) => {
    if (touchedRef.current) return
    await handleWishlistClick(stockId)
  }

  return (
    <div className="container-fluid px-0">
      <div className="table-responsive" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        <table className="table table-hover table-bordered align-middle w-100 mb-0">
          <thead className="table-light sticky-top">
            <tr>
              <th scope="col" className="text-nowrap px-2"></th>
              <th scope="col" className="text-nowrap px-2"></th>
              <th scope="col" className="text-nowrap px-2">Ticker</th>
              <th scope="col" className="text-nowrap px-2">Total Score</th>
              <th scope="col" className="text-nowrap px-2">Current Price</th>
              <th scope="col" className="text-nowrap px-2">Daily Profit</th>
              <th scope="col" className="text-nowrap px-2">Daily Return</th>
              <th scope="col" className="text-nowrap px-2">S/R Score</th>
              <th scope="col" className="text-nowrap px-2">Kinematics</th>
              <th scope="col" className="text-nowrap px-2">5D Velocity</th>
              <th scope="col" className="text-nowrap px-2">5D Acceleration</th>
              <th scope="col" className="text-nowrap px-2">Daily MACD Score</th>
              <th scope="col" className="text-nowrap px-2">Daily MACD Velocity</th>
              <th scope="col" className="text-nowrap px-2">Weekly MACD Score</th>
              <th scope="col" className="text-nowrap px-2">Weekly MACD Velocity</th>
              <th scope="col" className="text-nowrap px-2">MA Score</th>
              <th scope="col" className="text-nowrap px-2">MA 50D</th>
              <th scope="col" className="text-nowrap px-2">MA 100D</th>
              <th scope="col" className="text-nowrap px-2">MA 200D</th>
            </tr>
          </thead>

          <tbody>
            {tokens.length === 0 ? (
              <tr>
                <td colSpan={19} className="text-center py-4 text-muted px-2">
                  No tokens available.
                </td>
              </tr>
            ) : (
              tokens.map((token) => (
                <tr key={token.stock_id}>
                  <td className="text-center px-2 py-0" style={{ width: '48px' }}>
                    <button
                      type="button"
                      className="btn btn-link text-danger text-decoration-none w-100 h-100 py-2 px-0 rounded-0"
                      onClick={() => handleWishlistButtonClick(token.stock_id)}
                      onTouchStart={() => handleWishlistTouchStart(token.stock_id)}
                      aria-label={
                        token.wishlist
                          ? `Remove ${token.ticker} from wishlist`
                          : `Add ${token.ticker} to wishlist`
                      }
                    >
                      <i className={`bi ${token.wishlist ? 'bi-heart-fill' : 'bi-heart'}`}></i>
                    </button>
                  </td>

                  <td className="text-nowrap text-center px-2" style={{ width: '48px' }}>
                    <a
                      href={`https://www.tradingview.com/chart/Uy07wzBL/?symbol=${token.exchange}%3A${token.ticker}`}
                      className="text-danger text-decoration-none"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="bi bi-box-arrow-up-right"></i>
                    </a>
                  </td>

                  <td className="fw-semibold text-nowrap px-2">
                    <Link to={`/token/${token.ticker}`} className="link-dark text-decoration-none">
                      {token.ticker}
                    </Link>
                  </td>
                  <td className="text-nowrap px-2">{formatValue(token.total_score)}</td>
                  <td className="text-nowrap px-2">{formatValue(token.current_price, '$')}</td>
                  <td className="text-nowrap px-2">{formatValue(token.daily_profit, '$')}</td>
                  <td className="text-nowrap px-2">{formatValue(token.daily_return, '$')}</td>
                  <td className="text-nowrap px-2">{formatValue(token.support_resistance_score)}</td>
                  <td className="text-nowrap px-2">{formatValue(token.kinematics_score)}</td>
                  <td className="text-nowrap px-2">{formatValue(token.five_day_velocity_score)}</td>
                  <td className="text-nowrap px-2">{formatValue(token.five_day_acceleration_score)}</td>
                  <td className="text-nowrap px-2">{formatValue(token.daily_macd_score)}</td>
                  <td className="text-nowrap px-2">{formatValue(token.daily_macd_velocity)}</td>
                  <td className="text-nowrap px-2">{formatValue(token.weekly_macd_score)}</td>
                  <td className="text-nowrap px-2">{formatValue(token.weekly_macd_velocity)}</td>
                  <td className="text-nowrap px-2">{formatValue(token.ma_score)}</td>
                  <td className="text-nowrap px-2">{formatValue(token.ma_50d_score)}</td>
                  <td className="text-nowrap px-2">{formatValue(token.ma_100d_score)}</td>
                  <td className="text-nowrap px-2">{formatValue(token.ma_200d_score)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TokenTable