'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

interface OfferVariantComponent {
    id: number
    name_snapshot: string
    type: string
    quantity: number | null
    unit: string | null
    total_price: number
    visible_to_client: boolean
}

interface OfferVariant {
    id: number
    name: string
    is_recommended: boolean
    width_cm: number | null
    height_cm: number | null
    quantity: number | null
    total_price_net: number
    total_price_gross: number
    components: OfferVariantComponent[]
}

interface PublicOffer {
    token: string
    title: string | null
    company_name: string | null
    company_phone: string | null
    company_email: string | null
    valid_until: string | null
    status: string
    client_name: string | null
    variants: OfferVariant[]
    accepted_variant_id: number | null
    client_comment: string | null
}

export default function PublicOfferPage() {
    const params = useParams()
    const token = params.token as string

    const [offer, setOffer] = useState<PublicOffer | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 2 }).format(value)

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })

    useEffect(() => {
        const fetchOffer = async () => {
            try {
                const res = await axios.get(`${API_URL}/public/offer/${token}`)
                setOffer(res.data)
                // Auto-select recommended variant
                const recommended = res.data.variants.find((v: OfferVariant) => v.is_recommended)
                if (recommended) setSelectedVariantId(recommended.id)
                else if (res.data.variants.length === 1) setSelectedVariantId(res.data.variants[0].id)
            } catch (err: any) {
                if (err.response?.status === 410) {
                    setError('Ta oferta wygasła.')
                } else {
                    setError('Nie udało się załadować oferty.')
                }
            } finally {
                setLoading(false)
            }
        }
        fetchOffer()
    }, [token])

    const handleAccept = async () => {
        if (!selectedVariantId && offer && offer.variants.length > 1) {
            alert('Proszę wybrać wariant oferty.')
            return
        }
        setSubmitting(true)
        try {
            await axios.post(`${API_URL}/public/offer/${token}/accept`, {
                variant_id: selectedVariantId,
                comment: comment || null,
            })
            setSubmitted(true)
            setOffer((prev) => prev ? { ...prev, status: 'ACCEPTED', accepted_variant_id: selectedVariantId } : prev)
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Wystąpił błąd.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleReject = async () => {
        setSubmitting(true)
        try {
            await axios.post(`${API_URL}/public/offer/${token}/reject`, {
                comment: comment || null,
            })
            setSubmitted(true)
            setOffer((prev) => prev ? { ...prev, status: 'REJECTED' } : prev)
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Wystąpił błąd.')
        } finally {
            setSubmitting(false)
        }
    }

    const isResolved = offer?.status === 'ACCEPTED' || offer?.status === 'REJECTED'

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
                    <p className="text-gray-500 mt-4">Ładowanie oferty...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Przepraszamy</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        )
    }

    if (!offer) return null

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex items-start justify-between">
                        <div>
                            {offer.company_name && (
                                <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-1">{offer.company_name}</p>
                            )}
                            <h1 className="text-2xl font-bold text-gray-900">{offer.title || 'Oferta'}</h1>
                            {offer.client_name && (
                                <p className="text-gray-600 mt-1">Przygotowana dla: <strong>{offer.client_name}</strong></p>
                            )}
                        </div>
                        {offer.valid_until && (
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Ważna do</p>
                                <p className="font-semibold text-gray-900">{formatDate(offer.valid_until)}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Status banners */}
                {submitted && offer.status === 'ACCEPTED' && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                        <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                            <p className="font-semibold text-green-800">Oferta zaakceptowana</p>
                            <p className="text-sm text-green-700">Dziękujemy! Skontaktujemy się wkrótce.</p>
                        </div>
                    </div>
                )}

                {submitted && offer.status === 'REJECTED' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                        <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <div>
                            <p className="font-semibold text-red-800">Oferta odrzucona</p>
                            <p className="text-sm text-red-700">Dziękujemy za informację zwrotną.</p>
                        </div>
                    </div>
                )}

                {/* Variants */}
                <div className="space-y-4">
                    {offer.variants.map((v) => {
                        const isSelected = selectedVariantId === v.id
                        const isAccepted = offer.accepted_variant_id === v.id
                        const visibleComponents = v.components.filter((c) => c.visible_to_client)

                        return (
                            <div
                                key={v.id}
                                onClick={() => !isResolved && offer.variants.length > 1 && setSelectedVariantId(v.id)}
                                className={`bg-white rounded-2xl shadow-sm border-2 p-6 transition-all ${isAccepted ? 'border-green-400 ring-2 ring-green-200' :
                                        isSelected ? 'border-blue-400 ring-2 ring-blue-200' :
                                            'border-gray-200 hover:border-gray-300'
                                    } ${!isResolved && offer.variants.length > 1 ? 'cursor-pointer' : ''}`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        {!isResolved && offer.variants.length > 1 && (
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-500' : 'border-gray-300'}`}>
                                                {isSelected && <div className="w-3 h-3 rounded-full bg-blue-500" />}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">{v.name}</h3>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                                {v.width_cm && v.height_cm && <span>{Number(v.width_cm)}×{Number(v.height_cm)} cm</span>}
                                                {v.quantity && <span>{v.quantity} szt.</span>}
                                            </div>
                                        </div>
                                        {v.is_recommended && (
                                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">★ Polecany</span>
                                        )}
                                        {isAccepted && (
                                            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">✓ Wybrany</span>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(v.total_price_gross)}</p>
                                        <p className="text-sm text-gray-500">{formatCurrency(v.total_price_net)} netto</p>
                                    </div>
                                </div>

                                {/* Components summary */}
                                {visibleComponents.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <p className="text-sm font-medium text-gray-500 mb-2">Składniki:</p>
                                        <div className="space-y-1.5">
                                            {visibleComponents.map((c) => (
                                                <div key={c.id} className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-700">{c.name_snapshot}</span>
                                                    <span className="font-medium text-gray-900">{formatCurrency(c.total_price)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Action Section */}
                {!isResolved && (
                    <div className="bg-white rounded-2xl shadow-sm border p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Twoja decyzja</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Komentarz (opcjonalnie)</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={3}
                                placeholder="Dodaj uwagi do oferty..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleAccept}
                                disabled={submitting}
                                className="flex-1 py-3 px-6 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {submitting ? 'Przetwarzanie...' : 'Akceptuję ofertę'}
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={submitting}
                                className="py-3 px-6 bg-white text-red-600 font-semibold rounded-xl border-2 border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                                Odrzucam
                            </button>
                        </div>
                    </div>
                )}

                {/* Contact */}
                {(offer.company_email || offer.company_phone) && (
                    <div className="text-center py-6 text-sm text-gray-500">
                        <p>Pytania? Skontaktuj się z nami:</p>
                        <div className="flex items-center justify-center gap-4 mt-2">
                            {offer.company_email && (
                                <a href={`mailto:${offer.company_email}`} className="text-blue-600 hover:text-blue-700">{offer.company_email}</a>
                            )}
                            {offer.company_phone && (
                                <a href={`tel:${offer.company_phone}`} className="text-blue-600 hover:text-blue-700">{offer.company_phone}</a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
