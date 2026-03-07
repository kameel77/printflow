'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '@/components/AuthProvider'

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
    is_rotated?: boolean
  }>
  panel_methods?: Array<{
    method: string
    panels: Array<{
      width_cm: number
      height_cm: number
      quantity: number
    }>
    total_waste_m2: number
    num_panels: number
  }>
  debug?: string[]
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

export default function Calculator() {
  const { user, logout } = useAuth()
  // Input parameters
  const [width, setWidth] = useState<string>('')
  const [height, setHeight] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('1')
  const [templateId, setTemplateId] = useState<string>('')
  const [overlapOverride, setOverlapOverride] = useState<string>('')
  const [selectedOptions, setSelectedOptions] = useState<number[]>([])
  interface Adjustment {
    id: string
    desc: string
    type: 'amount' | 'percentage'
    value: string
  }
  const [customerType, setCustomerType] = useState<'B2C' | 'B2B'>('B2C')
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [productionDetailsOpen, setProductionDetailsOpen] = useState(false)
  const [techDetailsOpen, setTechDetailsOpen] = useState(true)

  // State
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null)


  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates()
  }, [])

  // Fetch template details when templateId changes
  useEffect(() => {
    if (templateId) {
      fetchTemplateDetails(parseInt(templateId))
      setSelectedOptions([]) // Reset options when template changes
    } else {
      setCurrentTemplate(null)
    }
  }, [templateId])

  // Helper: check if inputs are valid for calculation
  const canCalculate = Boolean(
    templateId &&
    width && parseFloat(width) > 0 &&
    height && parseFloat(height) > 0 &&
    quantity && parseInt(quantity) > 0
  )

  // Auto-calculate when parameters change
  useEffect(() => {
    if (canCalculate) {
      const timeoutId = setTimeout(() => {
        handleCalculate()
      }, 500)
      return () => clearTimeout(timeoutId)
    }
    // Clear result when inputs become invalid
    if (!canCalculate) {
      setResult(null)
      setError(null)
    }
  }, [width, height, quantity, templateId, overlapOverride, selectedOptions, canCalculate, adjustments])

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
    if (!canCalculate) return

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

      if (response.data.debug && Array.isArray(response.data.debug)) {
        console.group('✅ KALKULACJA OK — logi silnika:')
        response.data.debug.forEach((log: string) => console.log(`[CALC] ${log}`))
        console.groupEnd()
      }

      // Log panel methods (standard vs wycena_masowa)
      if (response.data.panel_methods && response.data.panel_methods.length > 0) {
        console.group('📐 METODY KALKULACJI BRYTÓW')
        response.data.panel_methods.forEach((pm: any) => {
          const labelMap: Record<string, string> = {
            standard: '📏 METODA STANDARDOWA (bryty równej szerokości)',
            wycena_masowa: '💰 WYCENA MASOWA (minimalizacja odpadów)',
            efektywna: '🎯 METODA EFEKTYWNA (optymalny dobór rolki)',
          }
          const label = labelMap[pm.method] ?? pm.method
          console.group(label)
          pm.panels.forEach((p: any) => {
            console.log(`  Ilość: ${p.quantity}, Rozmiar: ${p.width_cm.toFixed(1)}×${p.height_cm.toFixed(1)} cm`)
          })
          console.log(`  Łączna liczba brytów: ${pm.num_panels}`)
          console.log(`  Odpad: ${pm.total_waste_m2.toFixed(2)} m²`)
          console.groupEnd()
        })
        console.groupEnd()
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail

      // Handle structured error with debug logs and traceback
      if (detail && typeof detail === 'object' && detail.debug) {
        console.group('🔴 BŁĄD KALKULACJI')
        console.error('Komunikat:', detail.message)
        if (detail.debug && Array.isArray(detail.debug)) {
          console.group('[CALC] Logi silnika (do momentu błędu):')
          detail.debug.forEach((log: string) => console.log(`[CALC] ${log}`))
          console.groupEnd()
        }
        if (detail.traceback) {
          console.group('Python Traceback:')
          console.error(detail.traceback)
          console.groupEnd()
        }
        console.groupEnd()
        setError(detail.message || 'Wystąpił błąd podczas kalkulacji')
      } else {
        // Simple string error
        const errorMsg = typeof detail === 'string' ? detail : 'Wystąpił błąd podczas kalkulacji'
        console.error('Błąd kalkulacji:', errorMsg)
        setError(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }, [width, height, quantity, templateId, overlapOverride, selectedOptions, canCalculate, adjustments])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 2
    }).format(value)
  }

  const VAT_RATE = 1.23

  // Base calculated totals from result
  const baseTotalNet = result?.total_price_net || 0
  const totalCostCogs = result?.total_cost_cogs || 0

  let totalAdjustmentNet = 0
  adjustments.forEach(adj => {
    const val = parseFloat(adj.value.replace(',', '.'))
    if (!isNaN(val) && val !== 0) {
      if (adj.type === 'amount') {
        totalAdjustmentNet += val
      } else if (adj.type === 'percentage') {
        totalAdjustmentNet += baseTotalNet * (val / 100)
      }
    }
  })

  // Applied adjustment applies directly to Net price
  const adjustedTotalNet = baseTotalNet + totalAdjustmentNet
  const finalTotalNet = Math.max(0, adjustedTotalNet) // Ensure total doesn't go below 0

  const finalTotalGross = finalTotalNet * VAT_RATE

  // Margin based on adjusted net revenue
  const absoluteMargin = finalTotalNet - totalCostCogs
  const finalMarginPercentage = finalTotalNet > 0 ? (absoluteMargin / finalTotalNet) * 100 : 0

  const MIN_ORDER_VALUE = parseFloat(process.env.NEXT_PUBLIC_MIN_ORDER_VALUE || '40')
  const currentTotal = customerType === 'B2C' ? finalTotalGross : finalTotalNet

  // Get required and optional components
  const requiredComponents = currentTemplate?.components?.filter(c => c.is_required) || []
  const optionalComponents = currentTemplate?.components?.filter(c => !c.is_required) || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/icon.png"
                alt="Wally"
                width={48}
                height={48}
                className="rounded-lg"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Printflow MIS</h1>
                <p className="text-sm text-gray-500 mt-1">Kalkulacja prod. masowa</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Setup produktów
              </Link>

              <button
                onClick={handleCalculate}
                disabled={loading || !canCalculate}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Obliczanie...' : 'Przelicz'}
              </button>
              {user && (
                <div className="flex items-center gap-2 ml-2 pl-4 border-l border-gray-200">
                  <span className="text-xs text-gray-500 hidden md:inline">{user.email}</span>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-500 hover:text-red-600 transition-colors p-1"
                    title="Wyloguj"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Panel - Inputs */}
          <div className="lg:col-span-4 space-y-6">

            {/* Ustawienia Wyceny */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Ustawienia wyceny
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Typ klienta</label>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setCustomerType('B2C')}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${customerType === 'B2C'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      B2C (Ceny Brutto)
                    </button>
                    <button
                      onClick={() => setCustomerType('B2B')}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${customerType === 'B2B'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      B2B (Ceny Netto)
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">Określa, czy w podsumowaniu wyceny dominować będą kwoty brutto czy netto.</p>
                </div>
              </div>
            </div>

            {/* Product & Dimensions Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Produkt i wymiary
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wybierz produkt
                  </label>
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${!templateId ? 'text-gray-400' : ''}`}
                  >
                    <option value="">Wybierz produkt...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Szer. (cm)
                    </label>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      min="1"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Wys. (cm)
                    </label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      min="1"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Il. szt.
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      min="1"
                    />
                  </div>
                </div>

                {/* Template Components Summary */}
                {currentTemplate && (
                  <div className="pt-2 space-y-3">
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
            </div>

            {/* Advanced Options & Adjustments */}
            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Korekty wyceny
                  </div>
                  <button
                    onClick={() => setAdjustments([...adjustments, { id: Date.now().toString(), desc: 'Rabat dla stałego klienta', type: 'percentage', value: '-10' }])}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Dodaj
                  </button>
                </h2>

                <div className="space-y-3">
                  {adjustments.map((adj, index) => (
                    <div key={adj.id} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Opis</label>
                        <input
                          type="text"
                          value={adj.desc}
                          onChange={(e) => {
                            const newAdjs = [...adjustments]
                            newAdjs[index].desc = e.target.value
                            setAdjustments(newAdjs)
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Typ</label>
                        <select
                          value={adj.type}
                          onChange={(e) => {
                            const newAdjs = [...adjustments]
                            newAdjs[index].type = e.target.value as 'amount' | 'percentage'
                            setAdjustments(newAdjs)
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="amount">Kwota</option>
                          <option value="percentage">%</option>
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Wartość</label>
                        <input
                          type="number"
                          value={adj.value}
                          onChange={(e) => {
                            const newAdjs = [...adjustments]
                            newAdjs[index].value = e.target.value
                            setAdjustments(newAdjs)
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                        />
                      </div>
                      <div className="pt-5">
                        <button
                          onClick={() => setAdjustments(adjustments.filter(a => a.id !== adj.id))}
                          className="text-gray-400 hover:text-red-500 p-2 transition-colors"
                          title="Usuń"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {adjustments.length === 0 && (
                    <p className="text-sm text-gray-400 italic text-center py-2">Brak dodanych korekt wyceny.</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Wart. ujemna = Rabat. Procent jest liczony od sumy wartości składowych netto.</p>
                </div>
              </div>

              <hr className="border-gray-200" />

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                  Opcje zaawansowane
                </h2>
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
                  placeholder="Domyślnie z produktu"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Pozostaw puste, aby użyć wartości domyślnej z produktu
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
                    <p className="text-blue-100 text-sm font-medium mb-1">
                      {customerType === 'B2C' ? 'Cena brutto' : 'Cena netto'}
                    </p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(customerType === 'B2C' ? finalTotalGross : finalTotalNet)}
                    </p>
                    <div className="mt-2 pt-2 border-t border-white/10 text-blue-100 space-y-1">
                      <p className="text-xs font-medium">
                        {customerType === 'B2C'
                          ? `Netto: ${formatCurrency(finalTotalNet)} (Vat 23%)`
                          : `Brutto: ${formatCurrency(finalTotalGross)} (Vat 23%)`}
                      </p>
                      <p className="text-xs font-bold">
                        {formatCurrency((customerType === 'B2C' ? finalTotalGross : finalTotalNet) / (parseInt(quantity) || 1))} za 1 szt.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                    <p className="text-green-100 text-sm font-medium mb-1">Marża</p>
                    <p className="text-3xl font-bold">{finalMarginPercentage.toFixed(1)}%</p>
                    <p className="text-green-100 text-xs mt-2">
                      {formatCurrency(absoluteMargin)} zysk netto
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                    <p className="text-purple-100 text-sm font-medium mb-1">Koszt wytworzenia netto</p>
                    <p className="text-3xl font-bold">{formatCurrency(result.total_cost_cogs)}</p>
                  </div>
                </div>

                {/* Production Details — Accordion */}
                <div className="bg-white rounded-xl shadow-sm border">
                  <button
                    onClick={() => setProductionDetailsOpen(!productionDetailsOpen)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Szczegóły produkcyjne
                    </h3>
                    <span className="text-sm text-blue-600 font-medium">
                      {productionDetailsOpen ? 'zwiń' : 'rozwiń'}
                    </span>
                  </button>

                  {productionDetailsOpen && (
                    <div className="px-6 pb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Wymiar netto</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {parseFloat(width).toFixed(1)} × {parseFloat(height).toFixed(1)} cm
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Wymiar brutto</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {result.gross_dimensions.width.toFixed(1)} × {result.gross_dimensions.height.toFixed(1)} cm
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Bryty</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {result.num_panels} {result.is_split ? '(dzielone)' : '(jeden kawałek)'}
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Zakładka</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {result.overlap_used_cm.toFixed(1)} cm
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Technical Components */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <button
                    onClick={() => setTechDetailsOpen(!techDetailsOpen)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors bg-gray-50 border-b"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Składniki wyceny (widok techniczny)
                    </h3>
                    <span className="text-sm text-blue-600 font-medium">
                      {techDetailsOpen ? 'zwiń' : 'rozwiń'}
                    </span>
                  </button>

                  {techDetailsOpen && (
                    <div className="divide-y divide-gray-100">
                      {result.tech_view.map((component, index) => (
                        <div key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${component.type === 'MATERIAL'
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
                              <p className="font-semibold text-gray-900">
                                {formatCurrency(customerType === 'B2C' ? component.price_net * VAT_RATE : component.price_net)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {component.qty.toFixed(3)} {component.unit}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Adjustment Rows */}
                      {adjustments.map((adj) => {
                        const val = parseFloat(adj.value.replace(',', '.'))
                        if (isNaN(val) || val === 0) return null

                        const amountNet = adj.type === 'amount' ? val : baseTotalNet * (val / 100)

                        return (
                          <div key={adj.id} className="px-6 py-4 bg-gray-50 transition-colors border-t border-dashed">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${amountNet < 0
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-green-100 text-green-800'
                                    }`}>
                                    {amountNet < 0 ? 'RABAT' : 'DOPŁATA'}
                                  </span>
                                  <h4 className="font-medium text-gray-900">{adj.desc || 'Korekta wyceny'}</h4>
                                </div>
                                <p className="text-sm text-gray-500">
                                  {adj.type === 'percentage' ? `Kalkulowano jako ${val}% od sumy składowych netto.` : 'Korekta kwotowa netto.'}
                                </p>
                              </div>
                              <div className="text-right ml-4">
                                <p className={`font-semibold ${amountNet < 0 ? 'text-red-700' : 'text-green-700'}`}>
                                  {formatCurrency(customerType === 'B2C' ? amountNet * VAT_RATE : amountNet)}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {adj.type === 'percentage' ? `${val}%` : 'Kwota stała'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {/* Minimum Order Value Warning */}
                      {currentTotal > 0 && currentTotal < MIN_ORDER_VALUE && (
                        <div className="px-6 py-4 bg-white border-t">
                          <div className="p-3 bg-red-50 rounded-lg flex items-start gap-2 border border-red-100">
                            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <p className="text-sm text-red-800">
                              Uwaga! Poinformuj klienta, że minimalna wartość zamówienia to <span className="font-bold">{MIN_ORDER_VALUE} zł</span>.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                <p className="text-gray-500">Podaj wymiary i wybierz produkt, aby zobaczyć kalkulację</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
