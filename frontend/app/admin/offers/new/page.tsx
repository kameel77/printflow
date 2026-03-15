'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { useAuth } from '@/components/AuthProvider'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
const VAT_RATE = 1.23

interface Client {
    id: number
    name: string
    email: string | null
    phone: string | null
    company_name: string | null
    company_nip: string | null
}

interface CalcData {
    templateId: string
    templateName: string
    width: string
    height: string
    quantity: string
    customerType: 'B2C' | 'B2B'
    selectedOptions: number[]
    overlapOverride: string
    adjustments: Array<{ id: string; desc: string; type: string; value: string }>
    result: any
    finalTotalNet: number
    finalTotalGross: number
    finalMarginPercentage: number
}

interface VariantDraft {
    id: string
    name: string
    isRecommended: boolean
    totalPriceNet: number
    totalPriceGross: number
    calculationSnapshot: any
    components: Array<{
        name_snapshot: string
        type: string
        quantity: number | null
        unit: string | null
        unit_price: number | null
        total_price: number
        visible_to_client: boolean
    }>
    templateId: string
    width: string
    height: string
    quantity: string
}

export default function NewOfferPage() {
    const { user } = useAuth()
    const router = useRouter()

    // Client form
    const [clientSearch, setClientSearch] = useState('')
    const [clientResults, setClientResults] = useState<Client[]>([])
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [newClientMode, setNewClientMode] = useState(false)
    const [clientName, setClientName] = useState('')
    const [clientEmail, setClientEmail] = useState('')
    const [clientPhone, setClientPhone] = useState('')
    const [companyName, setCompanyName] = useState('')
    const [companyNip, setCompanyNip] = useState('')

    // Offer fields
    const [title, setTitle] = useState('')
    const [internalNote, setInternalNote] = useState('')
    const [validDays, setValidDays] = useState('14')

    // Variants
    const [variants, setVariants] = useState<VariantDraft[]>([])

    // UI
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('access_token')
        return token ? { Authorization: `Bearer ${token}` } : {}
    }, [])

    const formatCurrency = (value: number): string =>
        new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 2 }).format(value)

    // Load calculation from sessionStorage
    useEffect(() => {
        const stored = sessionStorage.getItem('offerCalculation')
        if (stored) {
            try {
                const calc: CalcData = JSON.parse(stored)
                setTitle(calc.templateName ? `${calc.templateName} ${calc.width}×${calc.height} cm` : '')

                const components = calc.result.tech_view.map((tv: any) => ({
                    name_snapshot: tv.name,
                    type: tv.type,
                    quantity: tv.qty,
                    unit: tv.unit,
                    unit_price: tv.price_net / (tv.qty || 1),
                    total_price: tv.price_net,
                    visible_to_client: true,
                }))

                // Add adjustments as components
                calc.adjustments.forEach((adj) => {
                    const val = parseFloat(adj.value.replace(',', '.'))
                    if (isNaN(val) || val === 0) return
                    const baseTotalNet = calc.result.total_price_net
                    const amountNet = adj.type === 'amount' ? val : baseTotalNet * (val / 100)
                    components.push({
                        name_snapshot: adj.desc || 'Korekta wyceny',
                        type: 'ADJUSTMENT',
                        quantity: null,
                        unit: null,
                        unit_price: null,
                        total_price: amountNet,
                        visible_to_client: true,
                    })
                })

                const variant: VariantDraft = {
                    id: Date.now().toString(),
                    name: 'Standard',
                    isRecommended: true,
                    totalPriceNet: calc.finalTotalNet,
                    totalPriceGross: calc.finalTotalGross,
                    calculationSnapshot: calc.result,
                    components,
                    templateId: calc.templateId,
                    width: calc.width,
                    height: calc.height,
                    quantity: calc.quantity,
                }
                setVariants([variant])
                sessionStorage.removeItem('offerCalculation')
            } catch (e) {
                console.error('Failed to parse calculation data:', e)
            }
        }
    }, [])

    // Client search
    useEffect(() => {
        if (clientSearch.length < 2) {
            setClientResults([])
            return
        }
        const timeoutId = setTimeout(async () => {
            try {
                const res = await axios.get(`${API_URL}/clients`, {
                    headers: getAuthHeaders(),
                    params: { q: clientSearch, limit: 5 },
                })
                setClientResults(res.data)
            } catch {
                setClientResults([])
            }
        }, 300)
        return () => clearTimeout(timeoutId)
    }, [clientSearch, getAuthHeaders])

    const selectExistingClient = (client: Client) => {
        setSelectedClient(client)
        setClientSearch('')
        setClientResults([])
        setNewClientMode(false)
    }

    const removeSelectedClient = () => {
        setSelectedClient(null)
        setNewClientMode(false)
        setClientName('')
        setClientEmail('')
        setClientPhone('')
        setCompanyName('')
        setCompanyNip('')
    }

    const removeVariant = (id: string) => {
        setVariants(variants.filter((v) => v.id !== id))
    }

    const toggleRecommended = (id: string) => {
        setVariants(variants.map((v) => ({ ...v, isRecommended: v.id === id })))
    }

    const handleSave = async (sendImmediately: boolean) => {
        setSaving(true)
        setError(null)

        try {
            const validUntil = new Date()
            validUntil.setDate(validUntil.getDate() + parseInt(validDays || '14'))

            const payload: any = {
                title,
                internal_note: internalNote,
                valid_until: validUntil.toISOString(),
                send_immediately: sendImmediately,
                variants: variants.map((v, i) => ({
                    name: v.name,
                    is_recommended: v.isRecommended,
                    template_id: v.templateId ? parseInt(v.templateId) : null,
                    width_cm: v.width ? parseFloat(v.width) : null,
                    height_cm: v.height ? parseFloat(v.height) : null,
                    quantity: v.quantity ? parseInt(v.quantity) : null,
                    total_price_net: v.totalPriceNet,
                    total_price_gross: v.totalPriceGross,
                    calculation_snapshot: v.calculationSnapshot,
                    sort_order: i,
                    components: v.components,
                })),
            }

            if (selectedClient) {
                payload.client_id = selectedClient.id
            } else if (newClientMode && clientName) {
                payload.client = {
                    name: clientName,
                    email: clientEmail || null,
                    phone: clientPhone || null,
                    company_name: companyName || null,
                    company_nip: companyNip || null,
                }
            }

            await axios.post(`${API_URL}/offers`, payload, {
                headers: getAuthHeaders(),
            })

            router.push('/admin/offers')
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Błąd zapisu oferty')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/admin/offers" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Nowa oferta</h1>
                                <p className="text-sm text-gray-500">Przygotuj ofertę dla klienta</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleSave(false)}
                                disabled={saving || variants.length === 0}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                            >
                                {saving ? 'Zapisywanie...' : 'Zapisz szkic'}
                            </button>
                            <button
                                onClick={() => handleSave(true)}
                                disabled={saving || variants.length === 0 || (!selectedClient && !clientEmail)}
                                className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors inline-flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                {saving ? 'Wysyłanie...' : 'Wyślij do klienta'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
                )}

                {/* 1. Client */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        1. Dane klienta
                    </h2>

                    {selectedClient ? (
                        <div className="flex items-center justify-between bg-blue-50 rounded-lg p-4">
                            <div>
                                <p className="font-medium text-gray-900">{selectedClient.name}</p>
                                <p className="text-sm text-gray-600">{selectedClient.email || '—'} • {selectedClient.phone || '—'}</p>
                                {selectedClient.company_name && (
                                    <p className="text-sm text-gray-500">{selectedClient.company_name}</p>
                                )}
                            </div>
                            <button onClick={removeSelectedClient} className="text-gray-400 hover:text-red-500 p-1">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ) : !newClientMode ? (
                        <div className="space-y-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={clientSearch}
                                    onChange={(e) => setClientSearch(e.target.value)}
                                    placeholder="Wyszukaj istniejącego klienta..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {clientResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-10">
                                        {clientResults.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => selectExistingClient(c)}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                            >
                                                <p className="font-medium text-gray-900">{c.name}</p>
                                                <p className="text-sm text-gray-500">{c.email} {c.company_name ? `• ${c.company_name}` : ''}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setNewClientMode(true)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Nowy klient
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Imię i nazwisko *</label>
                                    <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Adres email *</label>
                                    <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                                    <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Firma (opcjonalnie)</label>
                                    <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">NIP (opcjonalnie)</label>
                                    <input type="text" value={companyNip} onChange={(e) => setCompanyNip(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <button onClick={() => { setNewClientMode(false); removeSelectedClient() }}
                                className="text-sm text-gray-500 hover:text-gray-700">
                                ← Wróć do wyszukiwania
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. Variants */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        2. Warianty oferty
                    </h2>

                    {variants.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>Brak wariantów. Wróć do kalkulatora, aby dodać wariant z kalkulacji.</p>
                            <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block">
                                Przejdź do kalkulatora →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {variants.map((v) => (
                                <div key={v.id} className={`rounded-xl border-2 p-5 transition-colors ${v.isRecommended ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200'}`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="text"
                                                value={v.name}
                                                onChange={(e) => setVariants(variants.map((vr) => vr.id === v.id ? { ...vr, name: e.target.value } : vr))}
                                                className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:ring-0 p-0"
                                                placeholder="Nazwa wariantu"
                                            />
                                            {v.isRecommended && (
                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Polecany</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!v.isRecommended && (
                                                <button onClick={() => toggleRecommended(v.id)} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                                                    Oznacz jako polecany
                                                </button>
                                            )}
                                            {variants.length > 1 && (
                                                <button onClick={() => removeVariant(v.id)} className="text-gray-400 hover:text-red-500 p-1">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Dimensions */}
                                    <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                                        <span>Wymiary: {v.width}×{v.height} cm</span>
                                        <span>Ilość: {v.quantity} szt.</span>
                                    </div>

                                    {/* Components table */}
                                    <div className="rounded-lg border overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Składnik</th>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Typ</th>
                                                    <th className="px-4 py-2 text-right font-medium text-gray-500">Kwota netto</th>
                                                    <th className="px-4 py-2 text-center font-medium text-gray-500">Widoczny</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {v.components.map((c, ci) => (
                                                    <tr key={ci} className="hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-gray-900">{c.name_snapshot}</td>
                                                        <td className="px-4 py-2">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.type === 'MATERIAL' ? 'bg-purple-100 text-purple-700' :
                                                                    c.type === 'ADJUSTMENT' ? (c.total_price < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700') :
                                                                        'bg-orange-100 text-orange-700'
                                                                }`}>
                                                                {c.type === 'MATERIAL' ? 'Materiał' : c.type === 'ADJUSTMENT' ? (c.total_price < 0 ? 'Rabat' : 'Dopłata') : 'Proces'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(c.total_price)}</td>
                                                        <td className="px-4 py-2 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={c.visible_to_client}
                                                                onChange={(e) => {
                                                                    const newVariants = [...variants]
                                                                    const vIdx = newVariants.findIndex((vr) => vr.id === v.id)
                                                                    newVariants[vIdx].components[ci].visible_to_client = e.target.checked
                                                                    setVariants(newVariants)
                                                                }}
                                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Totals */}
                                    <div className="mt-3 flex items-center justify-between pt-3 border-t">
                                        <span className="text-sm text-gray-500">Suma wariantu:</span>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-gray-900">{formatCurrency(v.totalPriceNet)} <span className="text-sm font-normal text-gray-500">netto</span></p>
                                            <p className="text-sm text-gray-500">{formatCurrency(v.totalPriceGross)} brutto</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Offer Details */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        </svg>
                        3. Szczegóły oferty
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tytuł oferty</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                                placeholder="np. Fototapeta Lateksowa 200×300 cm"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ważność oferty (dni)</label>
                            <input type="number" value={validDays} onChange={(e) => setValidDays(e.target.value)} min="1" max="365"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notatka wewnętrzna</label>
                            <textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={2}
                                placeholder="Widoczna tylko dla zespołu..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
