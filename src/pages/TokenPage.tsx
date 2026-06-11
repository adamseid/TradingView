import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api, { getApiErrorMessage } from '../api/client'

import AppNavbar from '../components/AppNavbar'
import TokenLineChart from '../components/TokenLineChart'
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

interface ChartPoint {
  label: string
  value: number
}

interface PreparedRow {
  row: TokenHistoryRow
  timestamp: number
  dayKey: string
  dayLabel: string
  weekday: string
  hour: number
}

interface DailyMedianPoint {
  dayKey: string
  dayLabel: string
  price: number | null
  dailyMacd: number | null
  weeklyMacd: number | null
}

const EASTERN_TIME_ZONE = 'America/New_York'
const EASTERN_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: EASTERN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const EASTERN_DAY_LABEL_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: EASTERN_TIME_ZONE,
  month: 'short',
  day: 'numeric',
})

function getEasternDateParts(value: string) {
  const date = new Date(value)
  const timestamp = date.getTime()

  if (Number.isNaN(timestamp)) {
    return null
  }

  const parts = EASTERN_PARTS_FORMATTER.formatToParts(date)
  const lookup = new Map(parts.map((part) => [part.type, part.value]))
  const year = lookup.get('year')
  const month = lookup.get('month')
  const day = lookup.get('day')
  const weekday = lookup.get('weekday')
  const hour = lookup.get('hour')

  if (!year || !month || !day || !weekday || !hour) {
    return null
  }

  return {
    timestamp,
    dayKey: `${year}-${month}-${day}`,
    dayLabel: EASTERN_DAY_LABEL_FORMATTER.format(date),
    weekday,
    hour: Number(hour),
  }
}

function toNumericValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function prepareRows(rows: TokenHistoryRow[], isCrypto: boolean) {
  return rows
    .map((row) => {
      const dateParts = getEasternDateParts(row.date)

      if (!dateParts) {
        return null
      }

      if (!isCrypto) {
        const isWeekend = dateParts.weekday === 'Sat' || dateParts.weekday === 'Sun'
        const isAllowedHour = dateParts.hour >= 7 && dateParts.hour < 14

        if (isWeekend || !isAllowedHour) {
          return null
        }
      }

      return {
        row,
        timestamp: dateParts.timestamp,
        dayKey: dateParts.dayKey,
        dayLabel: dateParts.dayLabel,
        weekday: dateParts.weekday,
        hour: dateParts.hour,
      }
    })
    .filter((entry): entry is PreparedRow => entry !== null)
}

function getDailyMedianPoints(rows: TokenHistoryRow[], isCrypto: boolean) {
  const preparedRows = prepareRows(rows, isCrypto)
  const rowsByDay = new Map<string, PreparedRow[]>()

  preparedRows.forEach((entry) => {
    const dayRows = rowsByDay.get(entry.dayKey) ?? []
    dayRows.push(entry)
    rowsByDay.set(entry.dayKey, dayRows)
  })

  return [...rowsByDay.entries()]
    .sort(([leftDay], [rightDay]) => leftDay.localeCompare(rightDay))
    .map(([dayKey, dayRows]) => {
      const sortedRows = [...dayRows].sort((left, right) => left.timestamp - right.timestamp)
      const medianRow = sortedRows[Math.floor(sortedRows.length / 2)]

      return {
        dayKey,
        dayLabel: medianRow.dayLabel,
        price: toNumericValue(medianRow.row.current_price),
        dailyMacd: toNumericValue(medianRow.row.daily_macd_histogram),
        weeklyMacd: toNumericValue(medianRow.row.weekly_macd_histogram),
      }
    })
}

function buildPriceSeries(points: DailyMedianPoint[]) {
  return points
    .filter((point): point is DailyMedianPoint & { price: number } => point.price !== null)
    .map((point) => ({
      label: point.dayLabel,
      value: point.price,
    }))
}

function buildThreeDayAverageSeries(
  points: DailyMedianPoint[],
  macdKey: 'dailyMacd' | 'weeklyMacd',
) {
  const chartPoints: ChartPoint[] = []

  for (let index = 2; index < points.length; index += 1) {
    const window = points.slice(index - 2, index + 1)
    const macdValues = window.map((point) => point[macdKey])

    if (macdValues.some((value) => value === null)) {
      continue
    }

    const numericMacdValues = macdValues.filter(
      (value): value is number => value !== null,
    )
    const total = numericMacdValues.reduce((sum, value) => sum + value, 0)

    chartPoints.push({
      label: points[index].dayLabel,
      value: total / numericMacdValues.length,
    })
  }

  return chartPoints
}

function formatPriceValue(value: number) {
  if (Math.abs(value) >= 100) {
    return `$${value.toFixed(2)}`
  }

  return `$${value.toFixed(4)}`
}

function formatMacdValue(value: number) {
  return value.toFixed(4)
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
  const isCrypto = rows[0]?.screener?.toLowerCase() === 'crypto'
  const pageTitle = ticker?.toUpperCase() ?? 'Stock'
  const dailyMedianPoints = getDailyMedianPoints(rows, isCrypto)
  const priceSeries = buildPriceSeries(dailyMedianPoints)
  const dailyMacdSeries = buildThreeDayAverageSeries(dailyMedianPoints, 'dailyMacd')
  const weeklyMacdSeries = buildThreeDayAverageSeries(dailyMedianPoints, 'weeklyMacd')

  return (
    <>
      <AppNavbar />

      <div className="container-fluid py-4 px-3 px-md-4">
        <div className="row justify-content-center">
          <div className="col-12">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
              <div>
                <h1 className="display-6 fw-bold mb-1">{pageTitle}</h1>
              </div>

              <div className="d-flex gap-2 align-items-center">
                {exchange && (
                  <span className="badge text-bg-secondary">{exchange}</span>
                )}
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
                <div
                  className="card shadow-sm border-0 w-100"
                  style={{ maxHeight: '100vh' }}
                >
                  <div className="card-header bg-light fw-semibold">
                    Daily Graphs
                  </div>
                  <div className="card-body overflow-auto">
                    <div className="row g-4 align-items-stretch">
                      <div className="col-12 col-xl-4 d-flex">
                        <div className="w-100 h-100">
                          <TokenLineChart
                            data={priceSeries}
                            color="#0d6efd"
                            emptyMessage="No price chart data available."
                            title="Median Daily Price"
                            datasetLabel="Price"
                            height={320}
                            valueFormatter={formatPriceValue}
                          />
                        </div>
                      </div>

                      <div className="col-12 col-xl-4 d-flex">
                        <div className="w-100 h-100">
                          <TokenLineChart
                            data={dailyMacdSeries}
                            color="#198754"
                            emptyMessage="Need at least 3 daily MACD points to draw this chart."
                            title="3-Day Average Daily MACD Histogram"
                            datasetLabel="Daily MACD"
                            height={320}
                            valueFormatter={formatMacdValue}
                            showZeroLine
                          />
                        </div>
                      </div>

                      <div className="col-12 col-xl-4 d-flex">
                        <div className="w-100 h-100">
                          <TokenLineChart
                            data={weeklyMacdSeries}
                            color="#dc3545"
                            emptyMessage="Need at least 3 weekly MACD points to draw this chart."
                            title="3-Day Average Weekly MACD Histogram"
                            datasetLabel="Weekly MACD"
                            height={320}
                            valueFormatter={formatMacdValue}
                            showZeroLine
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card shadow-sm border-0 w-100">
                  <div className="card-header bg-light fw-semibold">
                    History
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
    </>
  )
}

export default TokenPage
