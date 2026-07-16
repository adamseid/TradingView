import { useEffect, useState } from 'react'
import Accordion from 'react-bootstrap/Accordion'
import { useParams } from 'react-router-dom'
import api, { getApiErrorMessage } from '../api/client'

import AppNavbar from '../components/AppNavbar'
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
}

interface DailyMedianPoint {
  dayKey: string
  dayLabel: string
  price: number | null
  dailyMacd: number | null
  weeklyMacd: number | null
  sma50: number | null
  sma100: number | null
  sma200: number | null
  strategyOneScore: number | null
  strategyTwoScore: number | null
}

interface DayMetricBuckets {
  price: number[]
  dailyMacd: number[]
  weeklyMacd: number[]
  sma50: number[]
  sma100: number[]
  sma200: number[]
  strategyOneScore: number[]
  strategyTwoScore: number[]
}

interface ChartSeriesCollection {
  medianPriceSeries: ChartPoint[]
  medianDailyMacdSeries: ChartPoint[]
  medianWeeklyMacdSeries: ChartPoint[]
  medianStrategyOneScoreSeries: ChartPoint[]
  medianStrategyTwoScoreSeries: ChartPoint[]
  averageDailyMacdSeries: ChartPoint[]
  averageWeeklyMacdSeries: ChartPoint[]
  strategyOneMovingAverageDatasets: ChartDataset[]
  strategyTwoMovingAverageDatasets: ChartDataset[]
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

function getMedianValue(values: Array<number | null>) {
  const numericValues = values
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right)

  if (numericValues.length === 0) {
    return null
  }

  const middleIndex = Math.floor(numericValues.length / 2)

  if (numericValues.length % 2 === 1) {
    return numericValues[middleIndex]
  }

  return (numericValues[middleIndex - 1] + numericValues[middleIndex]) / 2
}

function createDayMetricBuckets(): DayMetricBuckets {
  return {
    price: [],
    dailyMacd: [],
    weeklyMacd: [],
    sma50: [],
    sma100: [],
    sma200: [],
    strategyOneScore: [],
    strategyTwoScore: [],
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

function buildChartSeries(rows: TokenHistoryRow[], isCrypto: boolean): ChartSeriesCollection {
  const preparedRows = prepareRows(rows, isCrypto)
  const dayMap = new Map<string, { dayKey: string; dayLabel: string; metrics: DayMetricBuckets }>()

  preparedRows.forEach((entry) => {
    const existingDay = dayMap.get(entry.dayKey) ?? {
      dayKey: entry.dayKey,
      dayLabel: entry.dayLabel,
      metrics: createDayMetricBuckets(),
    }

    appendNumericValue(existingDay.metrics.price, entry.row.current_price)
    appendNumericValue(existingDay.metrics.dailyMacd, entry.row.daily_macd_histogram)
    appendNumericValue(existingDay.metrics.weeklyMacd, entry.row.weekly_macd_histogram)
    appendNumericValue(existingDay.metrics.sma50, entry.row.sma_50)
    appendNumericValue(existingDay.metrics.sma100, entry.row.sma_100)
    appendNumericValue(existingDay.metrics.sma200, entry.row.sma_200)
    appendNumericValue(existingDay.metrics.strategyOneScore, entry.row.strategy_one_score)
    appendNumericValue(existingDay.metrics.strategyTwoScore, entry.row.strategy_two_score)

    dayMap.set(entry.dayKey, existingDay)
  })

  const sortedDays = [...dayMap.values()].sort((left, right) =>
    left.dayKey.localeCompare(right.dayKey),
  )

  const dailyMedianPoints: DailyMedianPoint[] = sortedDays.map((day) => ({
    dayKey: day.dayKey,
    dayLabel: day.dayLabel,
    price: getMedianValue(day.metrics.price),
    dailyMacd: getMedianValue(day.metrics.dailyMacd),
    weeklyMacd: getMedianValue(day.metrics.weeklyMacd),
    sma50: getMedianValue(day.metrics.sma50),
    sma100: getMedianValue(day.metrics.sma100),
    sma200: getMedianValue(day.metrics.sma200),
    strategyOneScore: getMedianValue(day.metrics.strategyOneScore),
    strategyTwoScore: getMedianValue(day.metrics.strategyTwoScore),
  }))

  const buildMedianSeries = (selector: (point: DailyMedianPoint) => number | null) => {
    const chartPoints: ChartPoint[] = []

    dailyMedianPoints.forEach((point) => {
      const value = selector(point)

      if (value !== null) {
        chartPoints.push({
          label: point.dayLabel,
          value,
        })
      }
    })

    return chartPoints
  }

  const buildThreeDayAverageSeries = (metricKey: keyof DayMetricBuckets) => {
    const chartPoints: ChartPoint[] = []

    for (let index = 2; index < sortedDays.length; index += 1) {
      const windowValues = sortedDays
        .slice(index - 2, index + 1)
        .flatMap((day) => day.metrics[metricKey])
      const averageValue = getAverageValue(windowValues)

      if (averageValue === null) {
        continue
      }

      chartPoints.push({
        label: sortedDays[index].dayLabel,
        value: averageValue,
      })
    }

    return chartPoints
  }

  return {
    medianPriceSeries: buildMedianSeries((point) => point.price),
    medianDailyMacdSeries: buildMedianSeries((point) => point.dailyMacd),
    medianWeeklyMacdSeries: buildMedianSeries((point) => point.weeklyMacd),
    medianStrategyOneScoreSeries: buildMedianSeries((point) => point.strategyOneScore),
    medianStrategyTwoScoreSeries: buildMedianSeries((point) => point.strategyTwoScore),
    averageDailyMacdSeries: buildThreeDayAverageSeries('dailyMacd'),
    averageWeeklyMacdSeries: buildThreeDayAverageSeries('weeklyMacd'),
    strategyOneMovingAverageDatasets: [
      {
        label: 'MA 50D',
        color: '#0d6efd',
        data: buildMedianSeries((point) => point.sma50),
      },
      {
        label: 'MA 100D',
        color: '#198754',
        data: buildMedianSeries((point) => point.sma100),
      },
      {
        label: 'MA 200D',
        color: '#fd7e14',
        data: buildMedianSeries((point) => point.sma200),
      },
    ],
    strategyTwoMovingAverageDatasets: [
      {
        label: 'MA 50D',
        color: '#0d6efd',
        data: buildThreeDayAverageSeries('sma50'),
      },
      {
        label: 'MA 100D',
        color: '#198754',
        data: buildThreeDayAverageSeries('sma100'),
      },
      {
        label: 'MA 200D',
        color: '#fd7e14',
        data: buildThreeDayAverageSeries('sma200'),
      },
    ],
  }
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

function TokenAccordionHeader({
  title,
  previewData,
  color,
  datasetLabel,
}: {
  title: string
  previewData: ChartPoint[]
  color: string
  datasetLabel: string
}) {
  return (
    <div className="d-flex align-items-center justify-content-between gap-3 w-100 pe-3">
      <span className="fw-semibold">{title}</span>
      <div style={{ width: 220, minWidth: 180, pointerEvents: 'none' }}>
        <TokenLineChart
          data={previewData}
          color={color}
          emptyMessage="No chart data."
          title={title}
          datasetLabel={datasetLabel}
          height={64}
          valueFormatter={formatScoreValue}
          showZeroLine
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
  const {
    medianPriceSeries,
    medianDailyMacdSeries,
    medianWeeklyMacdSeries,
    medianStrategyOneScoreSeries,
    medianStrategyTwoScoreSeries,
    averageDailyMacdSeries,
    averageWeeklyMacdSeries,
    strategyOneMovingAverageDatasets,
    strategyTwoMovingAverageDatasets,
  } = buildChartSeries(rows, isCrypto)

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
              <Accordion alwaysOpen className="d-flex flex-column gap-3">
                <Accordion.Item eventKey="performance" className="shadow-sm border-0">
                  <Accordion.Header>Performance calculator</Accordion.Header>
                  <Accordion.Body />
                </Accordion.Item>

                <Accordion.Item eventKey="strategy-1" className="shadow-sm border-0">
                  <Accordion.Header>
                    <TokenAccordionHeader
                      title="Strategy 1"
                      previewData={medianStrategyOneScoreSeries}
                      color="#6f42c1"
                      datasetLabel="Score 1"
                    />
                  </Accordion.Header>
                  <Accordion.Body>
                    <div className="d-flex flex-column gap-4">
                      <TokenLineChart
                        data={medianPriceSeries}
                        color="#0d6efd"
                        emptyMessage="No median price data available."
                        title="Median Price"
                        datasetLabel="Price"
                        height={320}
                        valueFormatter={formatPriceValue}
                      />

                      <TokenLineChart
                        data={medianDailyMacdSeries}
                        color="#198754"
                        emptyMessage="No median daily MACD data available."
                        title="Median Daily MACD"
                        datasetLabel="Daily MACD"
                        height={320}
                        valueFormatter={formatMacdValue}
                        showZeroLine
                      />

                      <TokenLineChart
                        data={medianWeeklyMacdSeries}
                        color="#dc3545"
                        emptyMessage="No median weekly MACD data available."
                        title="Median Weekly MACD"
                        datasetLabel="Weekly MACD"
                        height={320}
                        valueFormatter={formatMacdValue}
                        showZeroLine
                      />

                      <TokenMultiLineChart
                        datasets={strategyOneMovingAverageDatasets}
                        emptyMessage="No median moving average data available."
                        title="Median Moving Averages"
                        height={320}
                        valueFormatter={formatPriceValue}
                      />

                      <TokenLineChart
                        data={medianStrategyOneScoreSeries}
                        color="#6f42c1"
                        emptyMessage="No median score 1 data available."
                        title="Median Score 1"
                        datasetLabel="Score 1"
                        height={320}
                        valueFormatter={formatScoreValue}
                        showZeroLine
                      />
                    </div>
                  </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="strategy-2" className="shadow-sm border-0">
                  <Accordion.Header>
                    <TokenAccordionHeader
                      title="Strategy 2"
                      previewData={medianStrategyTwoScoreSeries}
                      color="#fd7e14"
                      datasetLabel="Score 2"
                    />
                  </Accordion.Header>
                  <Accordion.Body>
                    <div className="d-flex flex-column gap-4">
                      <TokenLineChart
                        data={medianPriceSeries}
                        color="#0d6efd"
                        emptyMessage="No median price data available."
                        title="Median Price"
                        datasetLabel="Price"
                        height={320}
                        valueFormatter={formatPriceValue}
                      />

                      <TokenLineChart
                        data={averageDailyMacdSeries}
                        color="#198754"
                        emptyMessage="Need at least 3 days of daily MACD data."
                        title="3-Day Average Daily MACD"
                        datasetLabel="Daily MACD"
                        height={320}
                        valueFormatter={formatMacdValue}
                        showZeroLine
                      />

                      <TokenLineChart
                        data={averageWeeklyMacdSeries}
                        color="#dc3545"
                        emptyMessage="Need at least 3 days of weekly MACD data."
                        title="3-Day Average Weekly MACD"
                        datasetLabel="Weekly MACD"
                        height={320}
                        valueFormatter={formatMacdValue}
                        showZeroLine
                      />

                      <TokenMultiLineChart
                        datasets={strategyTwoMovingAverageDatasets}
                        emptyMessage="Need at least 3 days of moving average data."
                        title="3-Day Average Moving Averages"
                        height={320}
                        valueFormatter={formatPriceValue}
                      />

                      <TokenLineChart
                        data={medianStrategyTwoScoreSeries}
                        color="#fd7e14"
                        emptyMessage="No median score 2 data available."
                        title="Median Score 2"
                        datasetLabel="Score 2"
                        height={320}
                        valueFormatter={formatScoreValue}
                        showZeroLine
                      />
                    </div>
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
                      <TradingViewWidget
                        ticker={ticker.toUpperCase()}
                        exchange={exchange}
                      />
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
