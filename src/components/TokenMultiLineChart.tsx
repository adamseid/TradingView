import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

interface ChartPoint {
  label: string
  value: number
}

interface TokenMultiLineChartDataset {
  label: string
  color: string
  data: ChartPoint[]
}

interface TokenMultiLineChartProps {
  datasets: TokenMultiLineChartDataset[]
  emptyMessage: string
  title: string
  height?: number
  valueFormatter?: (value: number) => string
  showZeroLine?: boolean
}

function defaultValueFormatter(value: number) {
  return value.toFixed(3)
}

function TokenMultiLineChart({
  datasets,
  emptyMessage,
  title,
  height = 320,
  valueFormatter = defaultValueFormatter,
  showZeroLine = false,
}: TokenMultiLineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef = useRef<Chart<'line'> | null>(null)
  const hasData = datasets.some((dataset) => dataset.data.length > 0)

  useEffect(() => {
    if (!canvasRef.current || !hasData) {
      return undefined
    }

    chartRef.current?.destroy()

    const labels = Array.from(
      new Set(
        datasets.flatMap((dataset) => dataset.data.map((point) => point.label)),
      ),
    )

    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((dataset) => {
          const pointLookup = new Map(
            dataset.data.map((point) => [point.label, point.value]),
          )

          return {
            label: dataset.label,
            data: labels.map((label) => pointLookup.get(label) ?? null),
            borderColor: dataset.color,
            backgroundColor: dataset.color,
            pointBackgroundColor: dataset.color,
            pointBorderColor: dataset.color,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: dataset.color,
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBorderWidth: 2,
            borderWidth: 2.5,
            tension: 0.25,
            fill: false,
            spanGaps: false,
          }
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: title,
          },
          tooltip: {
            callbacks: {
              label: (context) =>
                `${context.dataset.label}: ${valueFormatter(context.parsed.y ?? 0)}`,
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            ticks: {
              callback: (tickValue) => valueFormatter(Number(tickValue)),
            },
            grid: {
              color: (context) => {
                const tickValue = Number(context.tick.value)

                if (showZeroLine && tickValue === 0) {
                  return 'rgba(220, 53, 69, 0.45)'
                }

                return 'rgba(108, 117, 125, 0.18)'
              },
              lineWidth: (context) => {
                const tickValue = Number(context.tick.value)
                return showZeroLine && tickValue === 0 ? 2 : 1
              },
            },
          },
        },
      },
    })

    chartRef.current = chart

    return () => {
      chart.destroy()
      chartRef.current = null
    }
  }, [datasets, hasData, showZeroLine, title, valueFormatter])

  if (!hasData) {
    return (
      <div
        className="d-flex align-items-center justify-content-center text-muted small rounded border bg-body-tertiary px-3"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

export default TokenMultiLineChart
