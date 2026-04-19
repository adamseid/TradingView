import { Link } from "react-router-dom"

export interface TokenHistoryRow {
  id: number
  ticker: string
  date: string
  current_price: number | null
  resistance: number | null
  support: number | null
  support_resistance_score: number | null
  sma_200: number | null
  ma_score: number | null
  daily_macd_histogram: number | null
  daily_macd_velocity: number | null
  daily_macd_score: number | null
  weekly_macd_histogram: number | null
  weekly_macd_velocity: number | null
  weekly_macd_score: number | null
  total_score: number | null
  direction: number | null
  exchange?: string
}

interface TokenHistoryTableProps {
  rows: TokenHistoryRow[]
}

function formatValue(value: number | string | null | undefined, prefix = '') {
  if (value === null || value === undefined || value === '') return '-'
  return `${prefix}${value}`
}

function formatDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString()
}

function TokenHistoryTable({ rows }: TokenHistoryTableProps) {
  return (
    <div className="table-responsive" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
      <table className="table table-hover table-bordered align-middle w-100 mb-0">
        <thead className="table-light sticky-top">
          <tr>
            <th scope="col" className="text-nowrap"></th>
            <th scope="col" className="text-nowrap">Date</th>
            <th scope="col" className="text-nowrap">Price</th>
            <th scope="col" className="text-nowrap">Support/Resistance Score</th>
            <th scope="col" className="text-nowrap">MA</th>
            <th scope="col" className="text-nowrap">MA Score</th>
            <th scope="col" className="text-nowrap">MACD 1D</th>
            <th scope="col" className="text-nowrap">MACD 1D Velocity</th>
            <th scope="col" className="text-nowrap">MACD 1D Score</th>
            <th scope="col" className="text-nowrap">MACD 1W</th>
            <th scope="col" className="text-nowrap">MACD 1W Velocity</th>
            <th scope="col" className="text-nowrap">MACD 1W Score</th>
            <th scope="col" className="text-nowrap">Total Score</th>
            <th scope="col" className="text-nowrap">Direction</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={15} className="text-center py-4 text-muted">
                No stock history found.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td className="text-nowrap">
                    <Link
                        to={`https://www.tradingview.com/chart/Uy07wzBL/?symbol=${row.exchange}%3A${row.ticker}`}
                        className="text-danger text-decoration-none"
                    >
                        <i className="bi bi-box-arrow-up-right"></i>
                    </Link>
                </td>
                <td className="text-nowrap">{formatDate(row.date)}</td>
                <td className="text-nowrap">{formatValue(row.current_price, '$')}</td>
                <td className="text-nowrap">{formatValue(row.support_resistance_score)}</td>
                <td className="text-nowrap">{formatValue(row.sma_200)}</td>
                <td className="text-nowrap">{formatValue(row.ma_score)}</td>
                <td className="text-nowrap">{formatValue(row.daily_macd_histogram)}</td>
                <td className="text-nowrap">{formatValue(row.daily_macd_velocity)}</td>
                <td className="text-nowrap">{formatValue(row.daily_macd_score)}</td>
                <td className="text-nowrap">{formatValue(row.weekly_macd_histogram)}</td>
                <td className="text-nowrap">{formatValue(row.weekly_macd_velocity)}</td>
                <td className="text-nowrap">{formatValue(row.weekly_macd_score)}</td>
                <td className="text-nowrap fw-semibold">{formatValue(row.total_score)}</td>
                <td className="text-nowrap">{formatValue(row.direction)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default TokenHistoryTable
