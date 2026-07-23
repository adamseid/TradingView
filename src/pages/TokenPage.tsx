import { useEffect, useMemo, useState } from 'react'
import Accordion from 'react-bootstrap/Accordion'
import { useParams } from 'react-router-dom'
import api, { getApiErrorMessage } from '../api/client'

import AppNavbar from '../components/AppNavbar'
import PerformanceCalculator, {
  type PerformanceCalculatorDayPoint,
} from '../components/PerformanceCalculator'
import TokenLineChart from '../components/TokenLineChart'
import TokenMultiLineChart from '../components/TokenMultiLineChart'
import TokenHistoryTable, { type TokenHistoryRow } from '../components/TokenHistoryTable'
import TradingViewWidget from '../components/TradingViewWidget'
import { formatCurrency, formatNumber } from '../utils/formatters'

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

interface ChartDataset {
  label: string
  color: string
  data: ChartPoint[]
}

interface PreparedRow {
  row: TokenHistoryRow
  timestamp: number
  dayKey: string
  dayLabel: string
  weekday: string
  hour: number
  year: number
  month: number
  day: number
}

interface MetricBuckets {
  price: number[]
  dailyMacd: number[]
  weeklyMacd: number[]
  sma50: number[]
  sma100: number[]
  sma200: number[]
  originalStrategyScore: number[]
  macdStrategyScore: number[]
}

interface AggregatedPoint {
  bucketKey: string
  label: string
  price: number | null
  dailyMacd: number | null
  weeklyMacd: number | null
  sma50: number | null
  sma100: number | null
  sma200: number | null
  originalStrategyScore: number | null
  macdStrategyScore: number | null
}

interface TimeframeChartBundle {
  priceSeries: ChartPoint[]
  dailyMacdSeries: ChartPoint[]
  weeklyMacdSeries: ChartPoint[]
  movingAverageDatasets: ChartDataset[]
  scoreSeries: ChartPoint[]
}

type StrategyKey = 'original' | 'macd'
type TimeframeKey = '1h' | '4h' | '1d' | '1w' | '1m'

interface TimeframeOption {
  key: TimeframeKey
  label: string
}

interface TimeframeSectionData {
  key: TimeframeKey
  label: string
  points: AggregatedPoint[]
  originalCharts: TimeframeChartBundle
  macdCharts: TimeframeChartBundle
}

const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { key: '1h', label: '1 hour' },
  { key: '4h', label: '4 hour' },
  { key: '1d', label: '1 day' },
  { key: '1w', label: '1 week' },
  { key: '1m', label: '1 month' },
]

const EASTERN_TIME_ZONE = 'America/New_York'
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
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
    year: Number(year),
    month: Number(month),
    day: Number(day),
    dayKey: `${year}-${month}-${day}`,
    dayLabel: `${MONTH_LABELS[Number(month) - 1]} ${Number(day)}`,
    weekday,
    hour: Number(hour),
  }
}

function padTwoDigits(value: number) {
  return String(value).padStart(2, '0')
}

function formatMonthDay(month: number, day: number) {
  return `${MONTH_LABELS[month - 1]} ${day}`
}

function formatHourLabel(month: number, day: number, hour: number) {
  return `${formatMonthDay(month, day)} ${padTwoDigits(hour)}:00`
}

function formatMonthLabel(month: number, year: number) {
  return `${MONTH_LABELS[month - 1]} ${year}`
}

function getWeekStartDate(year: number, month: number, day: number) {
  const currentDate = new Date(Date.UTC(year, month - 1, day))
  const weekday = currentDate.getUTCDay()
  const offset = weekday === 0 ? 6 : weekday - 1
  currentDate.setUTCDate(currentDate.getUTCDate() - offset)
  return currentDate
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
        year: dateParts.year,
        month: dateParts.month,
        day: dateParts.day,
      }
    })
    .filter((entry): entry is PreparedRow => entry !== null)
}

function createMetricBuckets(): MetricBuckets {
  return {
    price: [],
    dailyMacd: [],
    weeklyMacd: [],
    sma50: [],
    sma100: [],
    sma200: [],
    originalStrategyScore: [],
    macdStrategyScore: [],
  }
}

function appendNumericValue(target: number[], value: number | string | null | undefined) {
  const numericValue = toNumericValue(value)

  if (numericValue !== null) {
    target.push(numericValue)
  }
}

function getAverageValue(values: number[]) {
  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function getBucketMetadata(row: PreparedRow, timeframe: TimeframeKey) {
  switch (timeframe) {
    case '1h':
      return {
        key: `${row.dayKey}-${padTwoDigits(row.hour)}`,
        label: formatHourLabel(row.month, row.day, row.hour),
        startTimestamp: Date.UTC(row.year, row.month - 1, row.day, row.hour),
      }
    case '4h': {
      const startHour = Math.floor(row.hour / 4) * 4
      return {
        key: `${row.dayKey}-${padTwoDigits(startHour)}`,
        label: formatHourLabel(row.month, row.day, startHour),
        startTimestamp: Date.UTC(row.year, row.month - 1, row.day, startHour),
      }
    }
    case '1d':
      return {
        key: row.dayKey,
        label: row.dayLabel,
        startTimestamp: Date.UTC(row.year, row.month - 1, row.day),
      }
    case '1w': {
      const weekStart = getWeekStartDate(row.year, row.month, row.day)
      const month = weekStart.getUTCMonth() + 1
      const day = weekStart.getUTCDate()
      return {
        key: weekStart.toISOString().slice(0, 10),
        label: `Week of ${formatMonthDay(month, day)}`,
        startTimestamp: weekStart.getTime(),
      }
    }
    case '1m':
      return {
        key: `${row.year}-${padTwoDigits(row.month)}`,
        label: formatMonthLabel(row.month, row.year),
        startTimestamp: Date.UTC(row.year, row.month - 1, 1),
      }
  }
}

function aggregatePoints(preparedRows: PreparedRow[], timeframe: TimeframeKey) {
  const bucketMap = new Map<string, { key: string; label: string; startTimestamp: number; metrics: MetricBuckets }>()

  preparedRows.forEach((row) => {
    const bucket = getBucketMetadata(row, timeframe)
    const existingBucket = bucketMap.get(bucket.key) ?? {
      key: bucket.key,
      label: bucket.label,
      startTimestamp: bucket.startTimestamp,
      metrics: createMetricBuckets(),
    }

    appendNumericValue(existingBucket.metrics.price, row.row.current_price)
    appendNumericValue(existingBucket.metrics.dailyMacd, row.row.daily_macd_histogram)
    appendNumericValue(existingBucket.metrics.weeklyMacd, row.row.weekly_macd_histogram)
    appendNumericValue(existingBucket.metrics.sma50, row.row.sma_50)
    appendNumericValue(existingBucket.metrics.sma100, row.row.sma_100)
    appendNumericValue(existingBucket.metrics.sma200, row.row.sma_200)
    appendNumericValue(existingBucket.metrics.originalStrategyScore, row.row.original_strategy_score)
    appendNumericValue(existingBucket.metrics.macdStrategyScore, row.row.macd_strategy_score)

    bucketMap.set(bucket.key, existingBucket)
  })

  return [...bucketMap.values()]
    .sort((left, right) => left.startTimestamp - right.startTimestamp)
    .map((bucket) => ({
      bucketKey: bucket.key,
      label: bucket.label,
      price: getAverageValue(bucket.metrics.price),
      dailyMacd: getAverageValue(bucket.metrics.dailyMacd),
      weeklyMacd: getAverageValue(bucket.metrics.weeklyMacd),
      sma50: getAverageValue(bucket.metrics.sma50),
      sma100: getAverageValue(bucket.metrics.sma100),
      sma200: getAverageValue(bucket.metrics.sma200),
      originalStrategyScore: getAverageValue(bucket.metrics.originalStrategyScore),
      macdStrategyScore: getAverageValue(bucket.metrics.macdStrategyScore),
    }))
}

function buildSeries(points: AggregatedPoint[], selector: (point: AggregatedPoint) => number | null) {
  return points.flatMap((point) => {
    const value = selector(point)

    if (value === null) {
      return []
    }

    return [{
      label: point.label,
      value,
    }]
  })
}

function buildTimeframeCharts(points: AggregatedPoint[], strategy: StrategyKey): TimeframeChartBundle {
  const scoreSelector = strategy === 'original'
    ? (point: AggregatedPoint) => point.originalStrategyScore
    : (point: AggregatedPoint) => point.macdStrategyScore

  return {
    priceSeries: buildSeries(points, (point) => point.price),
    dailyMacdSeries: buildSeries(points, (point) => point.dailyMacd),
    weeklyMacdSeries: buildSeries(points, (point) => point.weeklyMacd),
    movingAverageDatasets: [
      {
        label: 'MA 50D',
        color: '#0d6efd',
        data: buildSeries(points, (point) => point.sma50),
      },
      {
        label: 'MA 100D',
        color: '#198754',
        data: buildSeries(points, (point) => point.sma100),
      },
      {
        label: 'MA 200D',
        color: '#fd7e14',
        data: buildSeries(points, (point) => point.sma200),
      },
    ],
    scoreSeries: buildSeries(points, scoreSelector),
  }
}

function buildStreakLabel(streak: number) {
  if (streak > 0) {
    return `+${streak} days`
  }

  if (streak < 0) {
    return `${streak} days`
  }

  return '0 days'
}

function getScoreStreak(points: AggregatedPoint[], strategy: StrategyKey) {
  const selector = strategy === 'original'
    ? (point: AggregatedPoint) => point.originalStrategyScore
    : (point: AggregatedPoint) => point.macdStrategyScore

  for (let index = points.length - 1; index >= 0; index -= 1) {
    const currentValue = selector(points[index])

    if (currentValue === null || currentValue === 50) {
      continue
    }

    const isPositive = currentValue > 50
    let count = 0

    for (let innerIndex = index; innerIndex >= 0; innerIndex -= 1) {
      const value = selector(points[innerIndex])

      if (value === null || value === 50) {
        break
      }

      if ((isPositive && value > 50) || (!isPositive && value < 50)) {
        count += 1
        continue
      }

      break
    }

    return isPositive ? count : count * -1
  }

  return 0
}

function formatPriceValue(value: number) {
  return formatCurrency(
    value,
    Math.abs(value) >= 100 ? 2 : 4,
    Math.abs(value) >= 100 ? 2 : 4,
  )
}

function formatMacdValue(value: number) {
  return formatNumber(value, 4, 4)
}

function formatScoreValue(value: number) {
  return formatNumber(value, 2, 2)
}

function StrategyAccordionHeader({
  title,
  streak,
  previewData,
  color,
  datasetLabel,
}: {
  title: string
  streak: number
  previewData: ChartPoint[]
  color: string
  datasetLabel: string
}) {
  const streakClassName = streak > 0
    ? 'text-bg-success'
    : streak < 0
      ? 'text-bg-danger'
      : 'text-bg-secondary'

  return (
    <div className="d-flex align-items-center justify-content-between gap-3 w-100 pe-3 flex-wrap flex-md-nowrap">
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <span className="fw-semibold">{title}</span>
        <span className={`badge ${streakClassName}`}>{buildStreakLabel(streak)}</span>
      </div>

      <div style={{ width: 220, minWidth: 180, pointerEvents: 'none' }}>
        <TokenLineChart
          data={previewData}
          color={color}
          emptyMessage="No chart data."
          title={title}
          datasetLabel={datasetLabel}
          height={64}
          valueFormatter={formatScoreValue}
          showLegend={false}
          showTitle={false}
          showAxes={false}
          pointRadius={0}
          pointHoverRadius={0}
          borderWidth={2}
        />
      </div>
    </div>
  )
}

function StrategyTimeframeContent({
  title,
  timeframeSections,
  strategy,
}: {
  title: string
  timeframeSections: TimeframeSectionData[]
  strategy: StrategyKey
}) {
  return (
    <Accordion alwaysOpen className="d-flex flex-column gap-3">
      {timeframeSections.map((section) => {
        const charts = strategy === 'original' ? section.originalCharts : section.macdCharts
        const scoreTitle = strategy === 'original' ? 'Original Strategy Score' : 'MACD 3 Day Strategy Score'

        return (
          <Accordion.Item key={`${strategy}-${section.key}`} eventKey={`${strategy}-${section.key}`} className="shadow-sm border-0">
            <Accordion.Header>{section.label}</Accordion.Header>
            <Accordion.Body>
              <div className="d-flex flex-column gap-4">
                <TokenLineChart
                  data={charts.priceSeries}
                  color="#0d6efd"
                  emptyMessage={`No ${section.label.toLowerCase()} average price data available.`}
                  title="Average Price"
                  datasetLabel="Price"
                  height={320}
                  valueFormatter={formatPriceValue}
                />

                <TokenLineChart
                  data={charts.dailyMacdSeries}
                  color="#198754"
                  emptyMessage={`No ${section.label.toLowerCase()} daily MACD data available.`}
                  title="Average Daily MACD"
                  datasetLabel="Daily MACD"
                  height={320}
                  valueFormatter={formatMacdValue}
                  showZeroLine
                />

                <TokenLineChart
                  data={charts.weeklyMacdSeries}
                  color="#dc3545"
                  emptyMessage={`No ${section.label.toLowerCase()} weekly MACD data available.`}
                  title="Average Weekly MACD"
                  datasetLabel="Weekly MACD"
                  height={320}
                  valueFormatter={formatMacdValue}
                  showZeroLine
                />

                <TokenMultiLineChart
                  datasets={charts.movingAverageDatasets}
                  emptyMessage={`No ${section.label.toLowerCase()} moving average data available.`}
                  title="Average Moving Averages"
                  height={320}
                  valueFormatter={formatPriceValue}
                />

                <TokenLineChart
                  data={charts.scoreSeries}
                  color={strategy === 'original' ? '#6f42c1' : '#fd7e14'}
                  emptyMessage={`No ${section.label.toLowerCase()} ${title.toLowerCase()} score data available.`}
                  title={`Average ${scoreTitle}`}
                  datasetLabel={scoreTitle}
                  height={320}
                  valueFormatter={formatScoreValue}
                  showZeroLine
                />
              </div>
            </Accordion.Body>
          </Accordion.Item>
        )
      })}
    </Accordion>
  )
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

  const preparedRows = useMemo(() => prepareRows(rows, isCrypto), [rows, isCrypto])

  const timeframeSections = useMemo(() => {
    return TIMEFRAME_OPTIONS.map((timeframe) => {
      const points = aggregatePoints(preparedRows, timeframe.key)
      return {
        key: timeframe.key,
        label: timeframe.label,
        points,
        originalCharts: buildTimeframeCharts(points, 'original'),
        macdCharts: buildTimeframeCharts(points, 'macd'),
      }
    })
  }, [preparedRows])

  const dailyTimeframeSection = timeframeSections.find((section) => section.key === '1d') ?? null
  const dailyAveragePoints: PerformanceCalculatorDayPoint[] = dailyTimeframeSection
    ? dailyTimeframeSection.points.map((point) => ({
        dayKey: point.bucketKey,
        dayLabel: point.label,
        price: point.price,
        originalStrategyScore: point.originalStrategyScore,
        macdStrategyScore: point.macdStrategyScore,
      }))
    : []

  const originalPreviewData = dailyTimeframeSection?.originalCharts.scoreSeries ?? []
  const macdPreviewData = dailyTimeframeSection?.macdCharts.scoreSeries ?? []
  const originalStreak = dailyTimeframeSection ? getScoreStreak(dailyTimeframeSection.points, 'original') : 0
  const macdStreak = dailyTimeframeSection ? getScoreStreak(dailyTimeframeSection.points, 'macd') : 0

  return (
    <>
      <AppNavbar />

      <div className="container-fluid py-4 px-3 px-md-4">
        <div className="row justify-content-center">
          <div className="col-12">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h1 className="display-6 fw-bold mb-1">{pageTitle}</h1>
                  {ticker && exchange && (
                    <a
                      href={`https://www.tradingview.com/chart/Uy07wzBL/?symbol=${exchange}%3A${ticker.toUpperCase()}`}
                      className="text-danger text-decoration-none fs-5"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${ticker.toUpperCase()} on TradingView`}
                    >
                      <i className="bi bi-box-arrow-up-right"></i>
                    </a>
                  )}
                </div>
              </div>

              <div className="d-flex gap-2 align-items-center">
                {exchange && <span className="badge text-bg-secondary">{exchange}</span>}
              </div>
            </div>

            {loading && (
              <div className="card border-0 shadow-sm">
                <div className="card-body py-5 text-center">
                  <div className="spinner-border" role="status" aria-hidden="true"></div>
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
              <Accordion alwaysOpen className="d-flex flex-column gap-3">
                <Accordion.Item eventKey="performance" className="shadow-sm border-0">
                  <Accordion.Header>Performance calculator</Accordion.Header>
                  <Accordion.Body>
                    <PerformanceCalculator dailyPoints={dailyAveragePoints} />
                  </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="original-strategy" className="shadow-sm border-0">
                  <Accordion.Header>
                    <StrategyAccordionHeader
                      title="Original strategy"
                      streak={originalStreak}
                      previewData={originalPreviewData}
                      color="#6f42c1"
                      datasetLabel="Original Strategy Score"
                    />
                  </Accordion.Header>
                  <Accordion.Body>
                    <StrategyTimeframeContent
                      title="Original strategy"
                      timeframeSections={timeframeSections}
                      strategy="original"
                    />
                  </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="macd-strategy" className="shadow-sm border-0">
                  <Accordion.Header>
                    <StrategyAccordionHeader
                      title="MACD 3 day strategy"
                      streak={macdStreak}
                      previewData={macdPreviewData}
                      color="#fd7e14"
                      datasetLabel="MACD 3 Day Strategy Score"
                    />
                  </Accordion.Header>
                  <Accordion.Body>
                    <StrategyTimeframeContent
                      title="MACD 3 day strategy"
                      timeframeSections={timeframeSections}
                      strategy="macd"
                    />
                  </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="history" className="shadow-sm border-0">
                  <Accordion.Header>History</Accordion.Header>
                  <Accordion.Body className="p-0">
                    <TokenHistoryTable rows={rows} />
                  </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="tradingview" className="shadow-sm border-0">
                  <Accordion.Header>TradingView Chart</Accordion.Header>
                  <Accordion.Body>
                    {ticker && exchange ? (
                      <TradingViewWidget ticker={ticker.toUpperCase()} exchange={exchange} />
                    ) : (
                      <div className="text-muted">No chart data available.</div>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default TokenPage
