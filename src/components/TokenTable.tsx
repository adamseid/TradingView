import { useState, useRef } from 'react'
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

type SortableColumn =
  | 'ticker'
  | 'total_score'
  | 'current_price'
  | 'daily_profit'
  | 'daily_return'
  | 'support_resistance_score'
  | 'kinematics_score'
  | 'five_day_velocity_score'
  | 'five_day_acceleration_score'
  | 'daily_macd_score'
  | 'daily_macd_velocity'
  | 'weekly_macd_score'
  | 'weekly_macd_velocity'
  | 'ma_score'
  | 'ma_50d_score'
  | 'ma_100d_score'
  | 'ma_200d_score'

type SortDirection = 'asc' | 'desc'

const sortableColumns: Array<{ key: SortableColumn; label: string }> = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'total_score', label: 'Total Score' },
  { key: 'current_price', label: 'Current Price' },
  { key: 'daily_profit', label: 'Daily Profit' },
  { key: 'daily_return', label: 'Daily Return' },
  { key: 'support_resistance_score', label: 'S/R Score' },
  { key: 'kinematics_score', label: 'Kinematics' },
  { key: 'five_day_velocity_score', label: '5D Velocity' },
  { key: 'five_day_acceleration_score', label: '5D Acceleration' },
  { key: 'daily_macd_score', label: 'Daily MACD Score' },
  { key: 'daily_macd_velocity', label: 'Daily MACD Velocity' },
  { key: 'weekly_macd_score', label: 'Weekly MACD Score' },
  { key: 'weekly_macd_velocity', label: 'Weekly MACD Velocity' },
  { key: 'ma_score', label: 'MA Score' },
  { key: 'ma_50d_score', label: 'MA 50D' },
  { key: 'ma_100d_score', label: 'MA 100D' },
  { key: 'ma_200d_score', label: 'MA 200D' },
]

function formatValue(value: number | null, prefix = '') {
  if (value === null || value === undefined) return '-'
  return `${prefix}${value}`
}

function compareNullableValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1

  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  }

  return Number(a) - Number(b)
}

function TokenTable({ tokens, fetchHomePageData }: TokenTableProps) {
  const isSubmittingRef = useRef(false)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState<SortableColumn>('ticker')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleWishlistClick = async (stockId: number) => {
    if (isSubmittingRef.current) return

    isSubmittingRef.current = true
    setError('')

    try {
      await api.post('/token/wishlist/toggle/', { stock_id: stockId })
    } catch (error) {
      console.error('Failed to toggle wishlist', error)
      setError('Failed to update wishlist. Please try again.')
    } finally {
      await fetchHomePageData()
      isSubmittingRef.current = false
    }
  }

  const triggerWishlist = (
    event: React.MouseEvent<HTMLButtonElement> | React.PointerEvent<HTMLButtonElement>,
    stockId: number,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    void handleWishlistClick(stockId)
  }

  const handleSort = (column: SortableColumn) => {
    if (sortKey === column) {
      setSortDirection((currentDirection) =>
        currentDirection === 'asc' ? 'desc' : 'asc',
      )
      return
    }

    setSortKey(column)
    setSortDirection('asc')
  }

  const renderSortableHeader = (key: SortableColumn, label: string) => {
    const isActive = sortKey === key
    const iconClass =
      isActive && sortDirection === 'asc'
        ? 'bi-sort-alpha-down'
        : 'bi-sort-alpha-up'

    return (
      <button
        type="button"
        className="btn btn-link p-0 text-decoration-none text-dark fw-semibold d-inline-flex align-items-center gap-2 w-100 text-start"
        onClick={() => handleSort(key)}
      >
        <i className={`bi ${iconClass} ${isActive ? '' : 'opacity-50'}`}></i>
        <span>{label}</span>
      </button>
    )
  }

  const sortedTokens = [...tokens].sort((left, right) => {
    const result = compareNullableValues(left[sortKey], right[sortKey])
    return sortDirection === 'asc' ? result : result * -1
  })

  return (
    <div className="container-fluid px-0">
      {error && <div className="alert alert-danger m-2 mb-0">{error}</div>}
      <div className="table-responsive" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        <table className="table table-hover table-bordered align-middle w-100 mb-0">
          <thead className="table-light sticky-top">
            <tr>
              <th scope="col" className="text-nowrap px-2"></th>
              <th scope="col" className="text-nowrap px-2"></th>
              {sortableColumns.map((column) => (
                <th key={column.key} scope="col" className="text-nowrap px-2">
                  {renderSortableHeader(column.key, column.label)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sortedTokens.length === 0 ? (
              <tr>
                <td colSpan={19} className="text-center py-4 text-muted px-2">
                  No tokens available.
                </td>
              </tr>
            ) : (
              sortedTokens.map((token) => (
                <tr key={token.stock_id}>
                  <td className="text-center px-2 py-0" style={{ width: '48px' }}>
                    <button
                      type="button"
                      className="btn btn-link text-danger text-decoration-none w-100 h-100 py-2 px-0 rounded-0"
                      onClick={(event) => triggerWishlist(event, token.stock_id)}
                      onPointerUp={(event) => {
                        if (event.pointerType !== 'mouse') {
                          triggerWishlist(event, token.stock_id)
                        }
                      }}
                      style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
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
