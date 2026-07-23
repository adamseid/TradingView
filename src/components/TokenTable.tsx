import { useState, useRef } from 'react'
import api from '../api/client'
import { Link } from 'react-router-dom'
import { formatCurrency, formatNumber } from '../utils/formatters'

export interface TokenRow {
  stock_id: number
  wishlist: number
  ticker: string
  exchange: string
  original_strategy_score: number | null
  macd_strategy_score: number | null
  current_price: number | null
  price_change: number | null
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
  | 'original_strategy_score'
  | 'macd_strategy_score'
  | 'current_price'
  | 'daily_profit'
  | 'daily_macd_score'
  | 'daily_macd_velocity'
  | 'weekly_macd_score'
  | 'weekly_macd_velocity'
  | 'ma_score'
  | 'ma_50d_score'
  | 'ma_100d_score'
  | 'ma_200d_score'

type SortDirection = 'asc' | 'desc'
type DerivedTokenRow = TokenRow & {
  daily_profit: number | null
}

const sortableColumns: Array<{ key: SortableColumn; label: string }> = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'original_strategy_score', label: 'Original Strategy Score' },
  { key: 'macd_strategy_score', label: 'MACD Strategy Score' },
  { key: 'current_price', label: 'Current Price' },
  { key: 'daily_profit', label: 'Daily Profit' },
  { key: 'daily_macd_score', label: 'Daily MACD Score' },
  { key: 'daily_macd_velocity', label: 'Daily MACD Velocity' },
  { key: 'weekly_macd_score', label: 'Weekly MACD Score' },
  { key: 'weekly_macd_velocity', label: 'Weekly MACD Velocity' },
  { key: 'ma_score', label: 'MA Score' },
  { key: 'ma_50d_score', label: 'MA 50D' },
  { key: 'ma_100d_score', label: 'MA 100D' },
  { key: 'ma_200d_score', label: 'MA 200D' },
]

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

function getDerivedTokenValues(token: TokenRow) {
  let daily_profit: number | null = null

  if (token.current_price !== null && token.price_change !== null) {
    daily_profit = token.current_price * (token.price_change / 100)
  }

  return {
    ...token,
    daily_profit,
  }
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

  const sortedTokens: DerivedTokenRow[] = tokens
    .map(getDerivedTokenValues)
    .sort((left, right) => {
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
                <td colSpan={15} className="text-center py-4 text-muted px-2">
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
                  <td className="text-nowrap px-2">{formatNumber(token.original_strategy_score, 0, 3)}</td>
                  <td className="text-nowrap px-2">{formatNumber(token.macd_strategy_score, 0, 3)}</td>
                  <td className="text-nowrap px-2">{formatCurrency(token.current_price)}</td>
                  <td className="text-nowrap px-2">{formatCurrency(token.daily_profit)}</td>
                  <td className="text-nowrap px-2">{formatNumber(token.daily_macd_score, 0, 3)}</td>
                  <td className="text-nowrap px-2">{formatNumber(token.daily_macd_velocity, 0, 3)}</td>
                  <td className="text-nowrap px-2">{formatNumber(token.weekly_macd_score, 0, 3)}</td>
                  <td className="text-nowrap px-2">{formatNumber(token.weekly_macd_velocity, 0, 3)}</td>
                  <td className="text-nowrap px-2">{formatNumber(token.ma_score, 0, 3)}</td>
                  <td className="text-nowrap px-2">{formatNumber(token.ma_50d_score, 0, 3)}</td>
                  <td className="text-nowrap px-2">{formatNumber(token.ma_100d_score, 0, 3)}</td>
                  <td className="text-nowrap px-2">{formatNumber(token.ma_200d_score, 0, 3)}</td>
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
