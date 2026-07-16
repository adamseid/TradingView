import { formatCurrency, formatNumber } from '../utils/formatters'

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
  strategy_one_score: number | null
  strategy_two_score: number | null
  strategy_one_direction?: number | null
  strategy_two_direction?: number | null
  exchange?: string
  screener?: string
}

interface TokenHistoryTableProps {
  rows: TokenHistoryRow[]
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
            <th scope="col" className="text-nowrap">Date</th>
            <th scope="col" className="text-nowrap">Score 1</th>
            <th scope="col" className="text-nowrap">Score 2</th>
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
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={13} className="text-center py-4 text-muted">
                No stock history found.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td className="text-nowrap">{formatDate(row.date)}</td>
                <td className="text-nowrap fw-semibold">{formatNumber(row.strategy_one_score, 0, 3)}</td>
                <td className="text-nowrap fw-semibold">{formatNumber(row.strategy_two_score, 0, 3)}</td>
                <td className="text-nowrap">{formatCurrency(row.current_price)}</td>
                <td className="text-nowrap">{formatNumber(row.support_resistance_score, 0, 3)}</td>
                <td className="text-nowrap">{formatNumber(row.sma_200, 0, 3)}</td>
                <td className="text-nowrap">{formatNumber(row.ma_score, 0, 3)}</td>
                <td className="text-nowrap">{formatNumber(row.daily_macd_histogram, 0, 3)}</td>
                <td className="text-nowrap">{formatNumber(row.daily_macd_velocity, 0, 3)}</td>
                <td className="text-nowrap">{formatNumber(row.daily_macd_score, 0, 3)}</td>
                <td className="text-nowrap">{formatNumber(row.weekly_macd_histogram, 0, 3)}</td>
                <td className="text-nowrap">{formatNumber(row.weekly_macd_velocity, 0, 3)}</td>
                <td className="text-nowrap">{formatNumber(row.weekly_macd_score, 0, 3)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default TokenHistoryTable
