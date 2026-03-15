'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useAuth } from '@/components/AuthProvider'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

interface OfferListItem {
    id: number
    token: string
    client: {
        id: number
        name: string
        email: string | null
        company_name: string | null
    } | null
    status: string
    title: string | null
    view_count: number
    total_value_net: number | null
    variant_count: number
    sent_at: string | null
    viewed_at: string | null
    responded_at: string | null
    created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Szkic', color: 'bg-gray-100 text-gray-700' },
    SENT: { label: 'Wysłana', color: 'bg-blue-100 text-blue-700' },
    VIEWED: { label: 'Wyświetlona', color: 'bg-yellow-100 text-yellow-700' },
    ACCEPTED: { label: 'Zaakceptowana', color: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Odrzucona', color: 'bg-red-100 text-red-700' },
    EXPIRED: { label: 'Wygasła', color: 'bg-gray-200 text-gray-500' },
}

export default function OffersPage() {
    const { user, logout } = useAuth()
    const [offers, setOffers] = useState<OfferListItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeFilter, setActiveFilter] = useState<string | null>(null)

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('access_token')
        return token ? { Authorization: `Bearer ${token}` } : {}
    }, [])

    const fetchOffers = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params: any = {}
            if (activeFilter) params.status = activeFilter

            const res = await axios.get(`${API_URL}/offers`, {
                headers: getAuthHeaders(),
                params,
            })
            setOffers(res.data)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Błąd ładowania ofert')
        } finally {
            setLoading(false)
        }
    }, [activeFilter, getAuthHeaders])

    useEffect(() => {
        fetchOffers()
    }, [fetchOffers])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: 'PLN',
            minimumFractionDigits: 2,
        }).format(value)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const handleDuplicate = async (offerId: number) => {
        try {
            await axios.post(`${API_URL}/offers/${offerId}/duplicate`, {}, {
                headers: getAuthHeaders(),
            })
            fetchOffers()
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Błąd duplikowania oferty')
        }
    }

    const handleSend = async (offerId: number) => {
        try {
            await axios.post(`${API_URL}/offers/${offerId}/send`, {}, {
                headers: getAuthHeaders(),
            })
            fetchOffers()
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Błąd wysyłki oferty')
        }
    }

    const filters = [
        { key: null, label: 'Wszystkie' },
        { key: 'DRAFT', label: 'Szkice' },
        { key: 'SENT', label: 'Wysłane' },
        { key: 'VIEWED', label: 'Wyświetlone' },
        { key: 'ACCEPTED', label: 'Zaakceptowane' },
        { key: 'REJECTED', label: 'Odrzucone' },
    ]

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Oferty</h1>
                            <p className="text-sm text-gray-500 mt-1">Zarządzanie ofertami dla klientów</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Kalkulator
                            </Link>
                            <Link
                                href="/admin/offers/new"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Nowa oferta
                            </Link>
                            {user && (
                                <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                                    <span className="text-xs text-gray-500 hidden md:inline">{user.email}</span>
                                    <button onClick={logout} className="text-sm text-gray-500 hover:text-red-600 transition-colors p-1" title="Wyloguj">
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
                {/* Error */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
                )}

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 mb-6 bg-white rounded-xl shadow-sm border p-1">
                    {filters.map((f) => (
                        <button
                            key={f.key || 'all'}
                            onClick={() => setActiveFilter(f.key)}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeFilter === f.key
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                ) : offers.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-500 mb-4">Brak ofert. Stwórz pierwszą ofertę z poziomu kalkulatora.</p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                        >
                            Przejdź do kalkulatora
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Oferta</th>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Klient</th>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Wartość netto</th>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Tracking</th>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Data</th>
                                    <th className="px-6 py-3 text-right font-medium text-gray-500">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {offers.map((offer) => {
                                    const statusCfg = STATUS_CONFIG[offer.status] || { label: offer.status, color: 'bg-gray-100 text-gray-700' }
                                    return (
                                        <tr key={offer.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">#{String(offer.id).padStart(3, '0')}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{offer.title || '—'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {offer.client ? (
                                                    <div>
                                                        <p className="font-medium text-gray-900">{offer.client.name}</p>
                                                        {offer.client.company_name && (
                                                            <p className="text-xs text-gray-500">{offer.client.company_name}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">Brak klienta</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {offer.total_value_net ? (
                                                    <span className="font-semibold text-gray-900">{formatCurrency(offer.total_value_net)}</span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                                {offer.variant_count > 1 && (
                                                    <p className="text-xs text-gray-500 mt-0.5">{offer.variant_count} warianty</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                                                    {statusCfg.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {offer.view_count > 0 ? (
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                        <span>{offer.view_count}×</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">Nie otwarto</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500">
                                                {formatDate(offer.created_at)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="inline-flex items-center gap-1">
                                                    <Link
                                                        href={`/admin/offers/${offer.id}`}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                                        title="Szczegóły"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </Link>
                                                    {offer.status === 'DRAFT' && (
                                                        <button
                                                            onClick={() => handleSend(offer.id)}
                                                            className="p-1.5 text-gray-400 hover:text-emerald-600 rounded transition-colors"
                                                            title="Wyślij"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDuplicate(offer.id)}
                                                        className="p-1.5 text-gray-400 hover:text-purple-600 rounded transition-colors"
                                                        title="Duplikuj"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
