'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

interface CalculationResult {
  total_price_net: number
  total_cost_cogs: number
  margin_percentage: number
  gross_dimensions: { width: number; height: number }
  is_split: boolean
  num_panels: number
  overlap_used_cm: number
  client_view: Array<{
    desc: string
    qty: number
    total: number
  }>
  tech_view: Array<{
    name: string
    type: string
    qty: number
    unit: string
    price_net: number
    details: string
  }>
}

interface Template {
  id: number
  name: string
  description: string
  components?: Array<{
    id: number
    name: string
    is_required: boolean
    type: 'MATERIAL' | 'PROCESS'
  }>
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'

export default function Calculator() {
  // Input parameters
  const [width, setWidth] = useState<string>('200')
  const [height, setHeight] = useState<string>('120')
  const [quantity, setQuantity] = useState<string>('1')
  const [templateId, setTemplateId] = useState<string>('1')
  const [overlapOverride, setOverlapOverride] = useState<string>('')
  const [selectedOptions, setSelectedOptions] = useState<number[]>([])
  
  // State
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null)
  const [autoCalculate, setAutoCalculate] = useState(true)

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates()
  }, [])

  // Fetch template details when templateId changes
  useEffect(() => {
    if (templateId) {
      fetchTemplateDetails(parseInt(templateId))
      setSelectedOptions([]) // Reset options when template changes
    }
  }, [templateId])

  // Auto-calculate when parameters change
  useEffect(() => {
    if (autoCalculate && width && height && quantity) {
      const timeoutId = setTimeout(() => {
        handleCalculate()
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [width, height, quantity, templateId, overlapOverride, selectedOptions, autoCalculate])

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/calculate/templates`)
      setTemplates(response.data.templates)
    } catch (err) {
      console.error('Failed to fetch templates:', err)
      // Fallback templates
      setTemplates([
        { id: 1, name: 'Fototapeta Lateksowa', description: 'Standardowa fototapeta' },
        { id: 2, name: 'Tablica Magnetyczna', description: 'Tablica z folią magnetyczną' }
      ])
    }
  }

  const fetchTemplateDetails = async (id: number) => {
    try {
      const response = await axios.get(`${API_URL}/calculate/templates/${id}`)
      setCurrentTemplate(response.data)
    } catch (err) {
      console.error('Failed to fetch template details:', err)
      // Fallback - use mock data based on template ID
      if (id === 1) {
        setCurrentTemplate({
          id: 1,
          name: 'Fototapeta Lateksowa',
          description: 'Standardowa fototapeta',
          components: [
            { id: 1, name: 'Papier Lateksowy', is_required: true, type: 'MATERIAL' },
            { id: 2, name: 'Cięcie CNC', is_required: true, type: 'PROCESS' }
          ]
        })
      } else if (id === 2) {
        setCurrentTemplate({
          id: 2,
          name: 'Tablica Magnetyczna',
          description: 'Tablica z folią magnetyczną',
          components: [
            { id: 3, name: 'Folia Magnetyczna', is_required: true, type: 'MATERIAL' },
            { id: 4, name: 'Laminowanie', is_required: false, type: 'PROCESS' },
            { id: 5, name: 'Cięcie CNC', is_required: true, type: 'PROCESS' }
          ]
        })
      }
    }
  }

  const handleOptionToggle = (optionId: number) => {
    setSelectedOptions(prev => {
      if (prev.includes(optionId)) {
        return prev.filter(id => id !== optionId)
      }
      return [...prev, optionId]
    })
  }

  const handleCalculate = useCallback(async () => {
    if (!width || !height || !quantity) return
    
    setLoading(true)
    setError(null)

    try {
      const payload: any = {
        width_cm: parseFloat(width),
        height_cm: parseFloat(height),
        quantity: parseInt(quantity),
        template_id: parseInt(templateId),
        selected_options: selectedOptions,
      }

      if (overlapOverride) {
        payload.overlap_override_cm = parseFloat(overlapOverride)
      }

      const response = await axios.post(`${API_URL}/calculate`, payload)
      setResult(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Wystąpił błąd podczas kalkulacji')
    } finally {
      setLoading(false)
    }
  }, [width, height, quantity, templateId, overlapOverride, selectedOptions])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 2
    }).format(value)
  }

  // Get required and optional components
  const requiredComponents = currentTemplate?.components?.filter(c => c.is_required) || []
  const optionalComponents = currentTemplate?.components?.filter(c => !c.is_required) || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kalkulator Wycen</h1>
              <p className="text-sm text-gray-500 mt-1">PrintFlow MIS - System wycen Satto Media</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={autoCalculate}
                  onChange={(e) => setAutoCalculate(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Auto-kalkulacja
              </label>
              <button
                onClick={handleCalculate}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Obliczanie...' : 'Przelicz'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel - Inputs */}
          <div className="lg:col-span-4 space-y-6">
            {/* Dimensions Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Wymiary produktu
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Szerokość (cm)
                  </label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    min="1"
                    step="0.1"
                    placeholder="np. 200"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    min="1"
                    step="0.1"
                    placeholder="np. 120"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ilość sztuk
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  min="1"
                  placeholder="1"
                />
              </div>
            </div>

            {/* Template Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Szablon produktu
              </h2>
              
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {/* Template Components Summary */}
              {currentTemplate && (
                <div className="mt-4 space-y-3">
                  {/* Required Components */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Elementy bazowe ({requiredComponents.length}):
                    </p>
                    <div className="space-y-1">
                      {requiredComponents.map((comp) => (
                        <div key={comp.id} className="flex items-center gap-2 text-sm text-gray-700">
                          <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs text-gray-400">{comp.type === 'MATERIAL' ? 'Materiał' : 'Proces'}</span>
                          <span className="text-gray-400">•</span>
                          {comp.name}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Optional Components */}
                  {optionalComponents.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Opcje dodatkowe ({optionalComponents.length}):
                      </p>
                      <div className="space-y-2">
                        {optionalComponents.map((comp) => (
                          <label key={comp.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedOptions.includes(comp.id)}
                              onChange={() => handleOptionToggle(comp.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-sm text-gray-700">{comp.name}</span>
                              <span className="text-xs text-gray-400">{comp.type === 'MATERIAL' ? 'Materiał' : 'Proces'}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Advanced Options */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Opcje zaawansowane
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nadpisanie zakładki (cm)
                </label>
                <input
                  type="number"
                  value={overlapOverride}
                  onChange={(e) => setOverlapOverride(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  min="0"
                  step="0.1"
                  placeholder="Domyślnie z szablonu"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Pozostaw puste, aby użyć wartości domyślnej z szablonu
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-8 space-y-6">
            {result ? (
              <>
                {/* Price Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                    <p className="text-blue-100 text-sm font-medium mb-1">Cena netto</p>
                    <p className="text-3xl font-bold">{formatCurrency(result.total_price_net)}</p>
                    <p className="text-blue-100 text-xs mt-2">
                      za {result.client_view[0]?.qty || quantity} szt.
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                    <p className="text-green-100 text-sm font-medium mb-1">Marża</p>
                    <p className="text-3xl font-bold">{result.margin_percentage.toFixed(1)}%</p>
                    <p className="text-green-100 text-xs mt-2">
                      {formatCurrency(result.total_price_net - result.total_cost_cogs)} zysk
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                    <p className="text-purple-100 text-sm font-medium mb-1">Koszt wytworzenia</p>
                    <p className="text-3xl font-bold">{formatCurrency(result.total_cost_cogs)}</p>
                    <p className="text-purple-100 text-xs mt-2">
                      COGS (koszt materiałów i procesów)
                    </p>
                  </div>
                </div>

                {/* Production Details */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Szczegóły produkcyjne
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Wymiar netto</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {width} × {height} cm
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Wymiar brutto</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {result.gross_dimensions.width.toFixed(1)} × {result.gross_dimensions.height.toFixed(1)} cm
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Bryty</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {result.num_panels} {result.is_split ? '(dzielone)' : '(jeden kawałek)'}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Zakładka</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {result.overlap_used_cm} cm
                      </p>
                    </div>
                  </div>
                </div>

                {/* Technical Components */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="px-6 py-4 border-b bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Składniki wyceny (widok techniczny)
                    </h3>
                  </div>
                  
                  <div className="divide-y divide-gray-100">
                    {result.tech_view.map((component, index) => (
                      <div key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                component.type === 'MATERIAL' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {component.type === 'MATERIAL' ? 'MATERIAŁ' : 'PROCES'}
                              </span>
                              <h4 className="font-medium text-gray-900">{component.name}</h4>
                            </div>
                            <p className="text-sm text-gray-500">{component.details}</p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-semibold text-gray-900">{formatCurrency(component.price_net)}</p>
                            <p className="text-sm text-gray-500">{component.qty.toFixed(3)} {component.unit}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="px-6 py-4 bg-gray-50 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">Suma:</span>
                      <span className="text-xl font-bold text-gray-900">{formatCurrency(result.total_price_net)}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Wprowadź parametry</h3>
                <p className="text-gray-500">Podaj wymiary i wybierz szablon, aby zobaczyć kalkulację</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
