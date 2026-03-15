'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
}

interface OfferFull {
    id: number
    status: string
    title: string | null
    internal_note: string | null
    valid_until: string | null
    client: Client | null
    variants: Array<{
        id: number
        name: string
        is_recommended: boolean
        width_cm: number | null
        height_cm: number | null
        quantity: number | null
        total_price_net: number
        total_price_gross: number
        template_id: number | null
        calculation_snapshot: any
        components: Array<{
            id: number
            name_snapshot: string
            type: string
            quantity: number | null
            unit: string | null
            unit_price: number | null
            total_price: number
            visible_to_client: boolean
        }>
    }>
}

interface VariantDraft {
    id: string
    dbId?: number
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

export default function EditOfferPage() {
    const params = useParams()
    const router = useRouter()
    const offerId = params.id as string

    const [offer, setOffer] = useState<OfferFull | null>(null)
    const [loadingOffer, setLoadingOffer] = useState(true)

    // Client
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)

    // Offer fields
    const [title, setTitle] = useState('')
    const [internalNote, setInternalNote] = useState('')
    const [validDays, setValidDays] = useState('14')

    // Variants
    const [variants, setVariants] = useState<VariantDraft[]>([])

    // UI
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [hasNewCalc, setHasNewCalc] = useState(false)

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('access_token')
        return token ? { Authorization: `Bearer ${token}` } : {}
    }, [])

    const formatCurrency = (value: number): string =>
        new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 2 }).format(value)

    // Load existing offer
    useEffect(() => {
        const fetchOffer = async () => {
            try {
                const res = await axios.get(`${API_URL}/offers/${offerId}`, { headers: getAuthHeaders() })
                const o: OfferFull = res.data
                setOffer(o)
                setSelectedClient(o.client)
                setTitle(o.title || '')
                setInternalNote(o.internal_note || '')
                if (o.valid_until) {
                    const days = Math.round((new Date(o.valid_until).getTime() - Date.now()) / 86400000)
                    setValidDays(String(Math.max(1, days)))
                }

                // Map existing variants → VariantDraft
                const existingVariants: VariantDraft[] = o.variants.map((v) => ({
                    id: String(v.id),
                    dbId: v.id,
                    name: v.name,
                    isRecommended: v.is_recommended,
                    totalPriceNet: v.total_price_net,
                    totalPriceGross: v.total_price_gross,
                    calculationSnapshot: v.calculation_snapshot,
                    components: v.components.map((c) => ({
                        name_snapshot: c.name_snapshot,
                        type: c.type,
                        quantity: c.quantity,
                        unit: c.unit,
                        unit_price: c.unit_price,
                        total_price: c.total_price,
                        visible_to_client: c.visible_to_client,
                    })),
                    templateId: v.template_id ? String(v.template_id) : '',
                    width: v.width_cm ? String(Number(v.width_cm)) : '',
                    height: v.height_cm ? String(Number(v.height_cm)) : '',
                    quantity: v.quantity ? String(v.quantity) : '',
                }))
                setVariants(existingVariants)
            } catch (err: any) {
                setError('Nie udało się załadować oferty')
            } finally {
                setLoadingOffer(false)
            }
        }
        fetchOffer()
    }, [offerId, getAuthHeaders])

    // Load new calculation from sessionStorage (if coming from calculator)
    useEffect(() => {
        const stored = sessionStorage.getItem('offerCalculation')
        if (!stored) return
        try {
            const calc = JSON.parse(stored)
            if (calc.editingOfferId !== offerId) return
            sessionStorage.removeItem('offerCalculation')
            setHasNewCalc(true)

            const components = (calc.result.tech_view || []).map((tv: any) => ({
                name_snapshot: tv.name,
                type: tv.type,
                quantity: tv.qty,
                unit: tv.unit,
                unit_price: tv.price_net / (tv.qty || 1),
                total_price: tv.price_net,
                visible_to_client: true,
            }))

            calc.adjustments?.forEach((adj: any) => {
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

            const updatedVariant: VariantDraft = {
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
            setVariants([updatedVariant])
            if (!calc.title && calc.templateName) {
                setTitle(`${calc.templateName} ${calc.width}×${calc.height} cm`)
            }
        } catch (e) {
            console.error('Failed to parse calculation:', e)
        }
    }, [offerId])

    const removeVariant = (id: string) => setVariants(variants.filter((v) => v.id !== id))
    const toggleRecommended = (id: string) => setVariants(variants.map((v) => ({ ...v, isRecommended: v.id === id })))

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

            await axios.patch(`${API_URL}/offers/${offerId}`, payload, {
                headers: getAuthHeaders(),
            })

            router.push(`/admin/offers/${offerId}`)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Błąd zapisu oferty')
        } finally {
            setSaving(false)
        }
    }

    if (loadingOffer) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href={`/admin/offers/${offerId}`} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">
                                    Edycja oferty #{String(offer?.id || offerId).padStart(3, '0')}
                                </h1>
                                <p className="text-sm text-gray-500">
                                    {hasNewCalc
                                        ? '✓ Wczytano nową kalkulację z kalkulatora'
                                        : 'Edycja istniejącej oferty'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleSave(false)}
                                disabled={saving || variants.length === 0}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                            >
                                {saving ? 'Zapisywanie...' : 'Zapisz'}
                            </button>
                            <button
                                onClick={() => handleSave(true)}
                                disabled={saving || variants.length === 0 || !selectedClient?.email}
                                className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors inline-flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                {saving ? 'Wysyłanie...' : 'Zapisz i wyślij'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

                {/* New calc banner */}
                {hasNewCalc && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center gap-3">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm">Wariant oferty został zastąpiony nową kalkulacją z kalkulatora. Sprawdź szczegóły i zapisz.</p>
                    </div>
                )}

                {/* Client info (readonly) */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Klient</h2>
                    {selectedClient ? (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="font-medium text-gray-900">{selectedClient.name}</p>
                            <p className="text-sm text-gray-600">{selectedClient.email || '—'} • {selectedClient.phone || '—'}</p>
                            {selectedClient.company_name && <p className="text-sm text-gray-500">{selectedClient.company_name}</p>}
                        </div>
                    ) : (
                        <p className="text-gray-400">Brak klienta</p>
                    )}
                </div>

                {/* Variants */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Warianty oferty ({variants.length})</h2>
                    <div className="space-y-4">
                        {variants.map((v) => (
                            <div key={v.id} className={`rounded-xl border-2 p-5 ${v.isRecommended ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200'}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={v.name}
                                            onChange={(e) => setVariants(variants.map((vr) => vr.id === v.id ? { ...vr, name: e.target.value } : vr))}
                                            className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:ring-0 p-0"
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

                                <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                                    {v.width && v.height && <span>{v.width}×{v.height} cm</span>}
                                    {v.quantity && <span>{v.quantity} szt.</span>}
                                </div>

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
                                                <tr key={ci}>
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
                                                                const nv = [...variants]
                                                                const vi = nv.findIndex((vr) => vr.id === v.id)
                                                                nv[vi].components[ci].visible_to_client = e.target.checked
                                                                setVariants(nv)
                                                            }}
                                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-3 flex justify-between items-center pt-3 border-t">
                                    <span className="text-sm text-gray-500">Suma:</span>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-gray-900">{formatCurrency(v.totalPriceNet)} <span className="text-sm font-normal text-gray-500">netto</span></p>
                                        <p className="text-sm text-gray-500">{formatCurrency(v.totalPriceGross)} brutto</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Offer details */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Szczegóły oferty</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tytuł oferty</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ważność (dni od teraz)</label>
                            <input type="number" value={validDays} onChange={(e) => setValidDays(e.target.value)} min="1" max="365"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notatka wewnętrzna</label>
                            <textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
