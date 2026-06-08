import { useState } from 'react'
import AppNavbar from '../components/AppNavbar'
import api, { getApiErrorMessage } from '../api/client'

interface AddStockApiResponse {
  response: {
    status: boolean
    message: string
    data: {
      stock: {
        id: number
        ticker: string
      }
    } | null
  }
}

type AssetType = 'stock' | 'crypto'

function AddStockPage() {
  const [assetType, setAssetType] = useState<AssetType>('stock')
  const [form, setForm] = useState({
    screener: 'america',
    ticker: '',
    name: '',
    exchange: '',
    category: '',
    sector: '',
    industry: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target

    if (name === 'assetType') {
      setAssetType(value as AssetType)
      setForm((current) => ({
        ...current,
        screener: value === 'crypto' ? 'crypto' : 'america',
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
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const { data } = await api.post<AddStockApiResponse>('/token/create/', {
        ...form,
      })

      if (!data.response.status) {
        throw new Error(data.response.message || 'Failed to create stock')
      }

      setSuccess(data.response.message)
      setForm({
        screener: 'america',
        ticker: '',
        name: '',
        exchange: '',
        category: '',
        sector: '',
        industry: '',
      })
      setAssetType('stock')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create stock'))
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
                  <h1 className="display-6 fw-bold mb-2">Add New Stock</h1>
                  <p className="text-muted mb-0">
                    Create a single stock or crypto record for the tracker.
                  </p>
                </div>

                {error && <div className="alert alert-danger">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="row g-4">
                    <div className="col-md-6">
                      <label htmlFor="assetType" className="form-label">
                        Asset Type
                      </label>
                      <select
                        id="assetType"
                        name="assetType"
                        className="form-select"
                        value={assetType}
                        onChange={handleChange}
                      >
                        <option value="stock">Stock</option>
                        <option value="crypto">Crypto</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="screener" className="form-label">
                        Screener
                      </label>
                      <input
                        id="screener"
                        name="screener"
                        className="form-control"
                        value={form.screener}
                        onChange={handleChange}
                      />
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
                      />
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
                        placeholder={assetType === 'crypto' ? 'COINBASE' : 'NASDAQ'}
                        required
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
                      />
                    </div>
                  </div>

                  <div className="mt-4 d-flex justify-content-end">
                    <button
                      type="submit"
                      className="btn btn-dark px-4"
                      disabled={submitting}
                    >
                      {submitting ? 'Saving...' : 'Create Stock'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AddStockPage
