'use client'

import { useState } from 'react'
import axios from 'axios'

interface CalculationResult {
  total_price_net: number
  total_cost_cogs: number
  margin_percentage: number
  gross_dimensions: { width: number; height: number }
  is_split: boolean
  num_panels: number
  overlap_used_cm: number
  tech_view: Array<{
    name: string
    type: string
    qty: number
    unit: string
    price_net: number
    details: string
  }>
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export default function Calculator() {
  const [width, setWidth] = useState<string>('100')
  const [height, setHeight] = useState<string>('100')
  const [quantity, setQuantity] = useState<string>('1')
  const [templateId, setTemplateId] = useState<string>('1')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await axios.post(`${API_URL}/calculate`, {
        width_cm: parseFloat(width),
        height_cm: parseFloat(height),
        quantity: parseInt(quantity),
        template_id: parseInt(templateId),
        selected_options: [],
      })

      setResult(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Wystąpił błąd podczas kalkulacji')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Input Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Kalkulator Wycen</h2>
        
        <form onSubmit={handleCalculate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Szerokość (cm)
              </label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                step="0.1"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wysokość (cm)
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                step="0.1"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ilość
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Szablon produktu
            </label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">Fototapeta Lateksowa</option>
              <option value="2">Tablica Magnetyczna</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Obliczanie...' : 'Oblicz wycenę'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Price Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Podsumowanie</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Cena netto</p>
                <p className="text-2xl font-bold text-blue-900">
                  {result.total_price_net.toFixed(2)} PLN
                </p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Marża</p>
                <p className="text-2xl font-bold text-green-900">
                  {result.margin_percentage.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div className="p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Wymiar brutto:</span>
                <p className="font-medium">{result.gross_dimensions.width.toFixed(1)} x {result.gross_dimensions.height.toFixed(1)} cm</p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Bryty:</span>
                <p className="font-medium">{result.num_panels} {result.is_split ? '(dzielone)' : '(jeden kawałek)'}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Zakładka:</span>
                <p className="font-medium">{result.overlap_used_cm} cm</p>
              </div>
            </div>
          </div>

          {/* Tech View */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Widok techniczny (produkcja)</h3>
            
            <div className="space-y-2">
              {result.tech_view.map((component, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`inline-block px-2 py-1 text-xs rounded ${
                        component.type === 'MATERIAL' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {component.type === 'MATERIAL' ? 'MATERIAŁ' : 'PROCES'}
                      </span>
                      <p className="font-medium mt-1">{component.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{component.price_net.toFixed(2)} PLN</p>
                      <p className="text-sm text-gray-600">{component.qty.toFixed(3)} {component.unit}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{component.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
