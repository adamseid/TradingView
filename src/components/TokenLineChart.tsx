interface ChartPoint {
  label: string
  value: number
}

interface TokenLineChartProps {
  data: ChartPoint[]
  color: string
  emptyMessage: string
  valueFormatter?: (value: number) => string
  showZeroLine?: boolean
}

const CHART_WIDTH = 800
const CHART_HEIGHT = 260
const PADDING_TOP = 24
const PADDING_RIGHT = 24
const PADDING_BOTTOM = 40
const PADDING_LEFT = 56

function defaultValueFormatter(value: number) {
  return value.toFixed(3)
}

function buildPath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
}

function TokenLineChart({
  data,
  color,
  emptyMessage,
  valueFormatter = defaultValueFormatter,
  showZeroLine = false,
}: TokenLineChartProps) {
  if (data.length === 0) {
    return <div className="text-muted">{emptyMessage}</div>
  }

  const values = data.map((point) => point.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueRange = maxValue - minValue || 1
  const chartInnerWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT
  const chartInnerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM

  const scaledPoints = data.map((point, index) => {
    const x =
      PADDING_LEFT +
      (data.length === 1 ? chartInnerWidth / 2 : (index / (data.length - 1)) * chartInnerWidth)
    const y =
      PADDING_TOP + ((maxValue - point.value) / valueRange) * chartInnerHeight

    return {
      ...point,
      x,
      y,
    }
  })

  const path = buildPath(scaledPoints)
  const zeroLineY =
    showZeroLine && minValue <= 0 && maxValue >= 0
      ? PADDING_TOP + ((maxValue - 0) / valueRange) * chartInnerHeight
      : null

  const xLabelIndexes =
    data.length <= 3
      ? data.map((_, index) => index)
      : [0, Math.floor((data.length - 1) / 2), data.length - 1]

  return (
    <div>
      <svg
        className="w-100"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label="Token chart"
      >
        <line
          x1={PADDING_LEFT}
          y1={PADDING_TOP}
          x2={PADDING_LEFT}
          y2={CHART_HEIGHT - PADDING_BOTTOM}
          stroke="rgba(108, 117, 125, 0.4)"
          strokeWidth="1"
        />
        <line
          x1={PADDING_LEFT}
          y1={CHART_HEIGHT - PADDING_BOTTOM}
          x2={CHART_WIDTH - PADDING_RIGHT}
          y2={CHART_HEIGHT - PADDING_BOTTOM}
          stroke="rgba(108, 117, 125, 0.4)"
          strokeWidth="1"
        />

        {zeroLineY !== null && (
          <line
            x1={PADDING_LEFT}
            y1={zeroLineY}
            x2={CHART_WIDTH - PADDING_RIGHT}
            y2={zeroLineY}
            stroke="rgba(220, 53, 69, 0.45)"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
        )}

        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {scaledPoints.map((point, index) => (
          <g key={`${point.label}-${point.value}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4" fill={color} />
            <title>{`${point.label}: ${valueFormatter(point.value)}`}</title>
          </g>
        ))}

        <text
          x={PADDING_LEFT - 8}
          y={PADDING_TOP + 4}
          textAnchor="end"
          fontSize="12"
          fill="currentColor"
        >
          {valueFormatter(maxValue)}
        </text>
        <text
          x={PADDING_LEFT - 8}
          y={CHART_HEIGHT - PADDING_BOTTOM + 4}
          textAnchor="end"
          fontSize="12"
          fill="currentColor"
        >
          {valueFormatter(minValue)}
        </text>

        {xLabelIndexes.map((index) => {
          const scaledPoint = scaledPoints[index]

          return (
            <text
              key={`${scaledPoint.label}-${scaledPoint.value}-${index}-label`}
              x={scaledPoint.x}
              y={CHART_HEIGHT - 12}
              textAnchor="middle"
              fontSize="12"
              fill="currentColor"
            >
              {scaledPoint.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

export default TokenLineChart
