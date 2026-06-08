import { useEffect, useState } from 'react'
import AppNavbar from '../components/AppNavbar'
import api, { getApiErrorMessage } from '../api/client'

interface EditableStock {
  id: number
  ticker: string
  name: string | null
  screener: string
  exchange: string
  category: string | null
  sector: string | null
  industry: string | null
  in_use: boolean
  image_url: string | null
}

interface StockListApiResponse {
  response: {
    status: boolean
    message: string
    data: {
      stocks: EditableStock[]
    }
  }
}

interface UpdateStockApiResponse {
  response: {
    status: boolean
    message: string
    data: {
      stock: EditableStock
    } | null
  }
}

function buildFormFromStock(stock: EditableStock) {
  return {
    ticker: stock.ticker,
    name: stock.name ?? '',
    screener: stock.screener,
    exchange: stock.exchange,
    category: stock.category ?? '',
    sector: stock.sector ?? '',
    industry: stock.industry ?? '',
    in_use: stock.in_use,
  }
}

function EditStockPage() {
  const [stocks, setStocks] = useState<EditableStock[]>([])
  const [selectedStockId, setSelectedStockId] = useState('')
  const [form, setForm] = useState({
    ticker: '',
    name: '',
    screener: 'america',
    exchange: '',
    category: '',
    sector: '',
    industry: '',
    in_use: true,
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setLoading(true)
        setError('')

        const { data } = await api.get<StockListApiResponse>('/token/edit-options/')

        if (!data.response.status) {
          throw new Error(data.response.message || 'Failed to load stocks')
        }

        setStocks(data.response.data.stocks ?? [])
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Failed to load stocks'))
      } finally {
        setLoading(false)
      }
    }

    void fetchStocks()
  }, [])

  const handleStockSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const stockId = event.target.value
    setSelectedStockId(stockId)
    setError('')
    setSuccess('')

    const selectedStock = stocks.find((stock) => String(stock.id) === stockId)
    if (!selectedStock) {
      setForm({
        ticker: '',
        name: '',
        screener: 'america',
        exchange: '',
        category: '',
        sector: '',
        industry: '',
        in_use: true,
      })
      return
    }

    setForm(buildFormFromStock(selectedStock))
  }

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = event.target
    const { name, value } = target

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setForm((current) => ({
        ...current,
        [name]: target.checked,
      }))
      return
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedStockId) {
      setError('Please select a stock first.')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const { data } = await api.post<UpdateStockApiResponse>(
        `/token/${selectedStockId}/update/`,
        form,
      )

      if (!data.response.status || !data.response.data?.stock) {
        throw new Error(data.response.message || 'Failed to update stock')
      }

      const updatedStock = data.response.data.stock

      setStocks((current) =>
        current
          .map((stock) => (stock.id === updatedStock.id ? updatedStock : stock))
          .sort((left, right) =>
            left.ticker.localeCompare(right.ticker, undefined, {
              numeric: true,
              sensitivity: 'base',
            }),
          ),
      )
      setForm(buildFormFromStock(updatedStock))
      setSelectedStockId(String(updatedStock.id))
      setSuccess(data.response.message)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to update stock'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <AppNavbar />

      <div className="container py-4 px-3 px-md-4">
        <div className="row justify-content-center">
          <div className="col-12 col-xl-9">
            <div className="card shadow-sm border-0">
              <div className="card-body p-4 p-md-5">
                <div className="mb-4">
                  <h1 className="display-6 fw-bold mb-2">Edit Stock</h1>
                  <p className="text-muted mb-0">
                    Choose an existing stock, update any field, and save the changes.
                  </p>
                </div>

                {error && <div className="alert alert-danger">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                {loading ? (
                  <div className="text-muted">Loading stocks...</div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="row g-4">
                      <div className="col-12">
                        <label htmlFor="selectedStockId" className="form-label">
                          Select Stock
                        </label>
                        <select
                          id="selectedStockId"
                          className="form-select"
                          value={selectedStockId}
                          onChange={handleStockSelect}
                        >
                          <option value="">Choose a stock...</option>
                          {stocks.map((stock) => (
                            <option key={stock.id} value={stock.id}>
                              {stock.ticker} - {stock.name || stock.exchange} (ID: {stock.id})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label htmlFor="ticker" className="form-label">
                          Ticker
                        </label>
                        <input
                          id="ticker"
                          name="ticker"
                          className="form-control"
                          value={form.ticker}
                          onChange={handleChange}
                          required
                          disabled={!selectedStockId}
                        />
                      </div>

                      <div className="col-md-6">
                        <label htmlFor="name" className="form-label">
                          Name
                        </label>
                        <input
                          id="name"
                          name="name"
                          className="form-control"
                          value={form.name}
                          onChange={handleChange}
                          disabled={!selectedStockId}
                        />
                      </div>

                      <div className="col-md-6">
                        <label htmlFor="screener" className="form-label">
                          Screener
                        </label>
                        <select
                          id="screener"
                          name="screener"
                          className="form-select"
                          value={form.screener}
                          onChange={handleChange}
                          disabled={!selectedStockId}
                        >
                          <option value="america">america</option>
                          <option value="canada">canada</option>
                          <option value="crypto">crypto</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label htmlFor="exchange" className="form-label">
                          Exchange
                        </label>
                        <input
                          id="exchange"
                          name="exchange"
                          className="form-control"
                          value={form.exchange}
                          onChange={handleChange}
                          required
                          disabled={!selectedStockId}
                        />
                      </div>

                      <div className="col-md-6">
                        <label htmlFor="category" className="form-label">
                          Category
                        </label>
                        <input
                          id="category"
                          name="category"
                          className="form-control"
                          value={form.category}
                          onChange={handleChange}
                          disabled={!selectedStockId}
                        />
                      </div>

                      <div className="col-md-6">
                        <label htmlFor="sector" className="form-label">
                          Sector
                        </label>
                        <input
                          id="sector"
                          name="sector"
                          className="form-control"
                          value={form.sector}
                          onChange={handleChange}
                          disabled={!selectedStockId}
                        />
                      </div>

                      <div className="col-md-6">
                        <label htmlFor="industry" className="form-label">
                          Industry
                        </label>
                        <input
                          id="industry"
                          name="industry"
                          className="form-control"
                          value={form.industry}
                          onChange={handleChange}
                          disabled={!selectedStockId}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label d-block">In Use</label>
                        <div className="form-check form-switch pt-2">
                          <input
                            id="in_use"
                            name="in_use"
                            type="checkbox"
                            className="form-check-input"
                            checked={form.in_use}
                            onChange={handleChange}
                            disabled={!selectedStockId}
                          />
                          <label htmlFor="in_use" className="form-check-label">
                            {form.in_use ? 'Active for sync' : 'Inactive for sync'}
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 d-flex justify-content-end">
                      <button
                        type="submit"
                        className="btn btn-dark px-4"
                        disabled={submitting || !selectedStockId}
                      >
                        {submitting ? 'Updating...' : 'Update Stock'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default EditStockPage
