import { useMemo, useState } from 'react'
import { formatNumber } from '../utils/formatters'
import type { PerformanceCalculatorDayPoint } from './PerformanceCalculator'

type StrategyKey = 'original' | 'macd'

type HorizonKey = 1 | 3 | 5 | 10

interface ScoreValidationStudyProps {
  dailyPoints: PerformanceCalculatorDayPoint[]
}

interface ForwardMetrics {
  returns: number[]
}

interface BucketMetrics {
  bucket: number
  count: number
  avg1d: number | null
  avg3d: number | null
  avg5d: number | null
  avg10d: number | null
  winRate1d: number | null
  winRate5d: number | null
}

const SCORE_BUCKETS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const
const FORWARD_HORIZONS: HorizonKey[] = [1, 3, 5, 10]

function toBucket(score: number) {
  return Math.max(0, Math.min(100, Math.round(score / 10) * 10))
}

function getAverage(values: number[]) {
  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function getWinRate(values: number[]) {
  if (values.length === 0) {
    return null
  }

  const wins = values.filter((value) => value > 0).length
  return (wins / values.length) * 100
}

function createEmptyForwardMetrics() {
  return {
    1: { returns: [] },
    3: { returns: [] },
    5: { returns: [] },
    10: { returns: [] },
  } as Record<HorizonKey, ForwardMetrics>
}

function getMetricClassName(value: number | null) {
  if (value === null || value === 0) {
    return ''
  }

  return value > 0 ? 'text-success' : 'text-danger'
}

function formatMetricPercent(value: number | null) {
  if (value === null) {
    return 'N/A'
  }

  const prefix = value > 0 ? '+' : ''
  return `${prefix}${formatNumber(value, 2, 2)}%`
}

function formatWinRatePercent(value: number | null) {
  if (value === null) {
    return 'N/A'
  }

  return `${formatNumber(value, 2, 2)}%`
}

function buildBucketMetrics(
  dailyPoints: PerformanceCalculatorDayPoint[],
  strategy: StrategyKey,
): BucketMetrics[] {
  const sortedPoints = [...dailyPoints]
    .filter((point): point is PerformanceCalculatorDayPoint & { price: number } => point.price !== null)
    .sort((left, right) => left.dayKey.localeCompare(right.dayKey))

  const bucketMap = new Map<number, Record<HorizonKey, ForwardMetrics>>()

  SCORE_BUCKETS.forEach((bucket) => {
    bucketMap.set(bucket, createEmptyForwardMetrics())
  })

  sortedPoints.forEach((point, index) => {
    const score = strategy === 'original'
      ? point.originalStrategyScore
      : point.macdStrategyScore

    if (score === null) {
      return
    }

    const bucket = toBucket(score)
    const metrics = bucketMap.get(bucket)

    if (!metrics) {
      return
    }

    FORWARD_HORIZONS.forEach((horizon) => {
      const futurePoint = sortedPoints[index + horizon]

      if (!futurePoint || point.price <= 0) {
        return
      }

      const forwardReturn = ((futurePoint.price - point.price) / point.price) * 100
      metrics[horizon].returns.push(forwardReturn)
    })
  })

  return SCORE_BUCKETS.map((bucket) => {
    const metrics = bucketMap.get(bucket) ?? createEmptyForwardMetrics()
    const returns1d = metrics[1].returns
    const returns3d = metrics[3].returns
    const returns5d = metrics[5].returns
    const returns10d = metrics[10].returns

    return {
      bucket,
      count: returns1d.length,
      avg1d: getAverage(returns1d),
      avg3d: getAverage(returns3d),
      avg5d: getAverage(returns5d),
      avg10d: getAverage(returns10d),
      winRate1d: getWinRate(returns1d),
      winRate5d: getWinRate(returns5d),
    }
  })
}

function ScoreValidationStudy({ dailyPoints }: ScoreValidationStudyProps) {
  const [strategy, setStrategy] = useState<StrategyKey>('original')

  const bucketMetrics = useMemo(
    () => buildBucketMetrics(dailyPoints, strategy),
    [dailyPoints, strategy],
  )

  const strategyTitle = strategy === 'original' ? 'Original strategy' : 'MACD 3 day strategy'

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h3 className="h5 mb-1">Score validation</h3>
          <p className="text-muted mb-0 small">
            Bucket daily normalized scores and measure the forward average return and win rate after 1, 3, 5, and 10 trading days.
          </p>
        </div>

        <div className="btn-group" role="group" aria-label="Select validation strategy">
          <button
            type="button"
            className={`btn ${strategy === 'original' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setStrategy('original')}
          >
            Original strategy
          </button>
          <button
            type="button"
            className={`btn ${strategy === 'macd' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setStrategy('macd')}
          >
            MACD 3 day strategy
          </button>
        </div>
      </div>

      <div className="small text-muted">
        Viewing validation for <span className="fw-semibold text-body">{strategyTitle}</span> using rounded 10-point score buckets.
      </div>

      <div className="table-responsive">
        <table className="table table-hover table-bordered align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th scope="col" className="text-nowrap">Score bucket</th>
              <th scope="col" className="text-nowrap">Count</th>
              <th scope="col" className="text-nowrap">Avg 1D</th>
              <th scope="col" className="text-nowrap">Avg 3D</th>
              <th scope="col" className="text-nowrap">Avg 5D</th>
              <th scope="col" className="text-nowrap">Avg 10D</th>
              <th scope="col" className="text-nowrap">Win Rate 1D</th>
              <th scope="col" className="text-nowrap">Win Rate 5D</th>
            </tr>
          </thead>

          <tbody>
            {bucketMetrics.map((row) => (
              <tr key={row.bucket}>
                <td className="text-nowrap fw-semibold">{row.bucket}</td>
                <td className="text-nowrap">{formatNumber(row.count, 0, 0)}</td>
                <td className={`text-nowrap ${getMetricClassName(row.avg1d)}`}>{formatMetricPercent(row.avg1d)}</td>
                <td className={`text-nowrap ${getMetricClassName(row.avg3d)}`}>{formatMetricPercent(row.avg3d)}</td>
                <td className={`text-nowrap ${getMetricClassName(row.avg5d)}`}>{formatMetricPercent(row.avg5d)}</td>
                <td className={`text-nowrap ${getMetricClassName(row.avg10d)}`}>{formatMetricPercent(row.avg10d)}</td>
                <td className={`text-nowrap ${getMetricClassName(row.winRate1d === null ? null : row.winRate1d - 50)}`}>{formatWinRatePercent(row.winRate1d)}</td>
                <td className={`text-nowrap ${getMetricClassName(row.winRate5d === null ? null : row.winRate5d - 50)}`}>{formatWinRatePercent(row.winRate5d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ScoreValidationStudy
