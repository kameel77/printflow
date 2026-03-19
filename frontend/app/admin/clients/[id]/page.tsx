'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { useAuth } from '@/components/AuthProvider'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

interface ClientFull {
    id: number
    name: string
    email: string | null
    phone: string | null
    company_name: string | null
    company_nip: string | null
    company_address: string | null
    notes: string | null
    created_at: string
}

interface OfferListItem {
    id: number
    token: string
    status: string
    title: string | null
    view_count: number
    total_value_net: number | null
    variant_count: number
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

export default function ClientDetailPage() {
    const params = useParams()
    const { user, logout } = useAuth()
    const [client, setClient] = useState<ClientFull | null>(null)
    const [offers, setOffers] = useState<OfferListItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const clientId = params.id as string

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('access_token')
        return token ? { Authorization: `Bearer ${token}` } : {}
    }, [])

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [clientRes, offersRes] = await Promise.all([
                axios.get(`${API_URL}/clients/${clientId}`, { headers: getAuthHeaders() }),
                axios.get(`${API_URL}/offers`, { headers: getAuthHeaders(), params: { client_id: clientId } })
            ])
            setClient(clientRes.data)
            setOffers(offersRes.data)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Błąd ładowania danych klienta')
        } finally {
            setLoading(false)
        }
    }, [clientId, getAuthHeaders])

    useEffect(() => {
        if (clientId) {
            fetchData()
        }
    }, [clientId, fetchData])

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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/admin/clients" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Karta klienta</h1>
                                <p className="text-sm text-gray-500 mt-1">{loading ? 'Wczytywanie...' : client?.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                Kalkulator
                            </Link>
                            <Link href="/admin/offers" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                Oferty
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
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                ) : client && (
                    <div className="space-y-6">
                        {/* Client Details Card */}
                        <div className="bg-white rounded-xl shadow-sm border p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Dane klienta</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <span className="block text-sm font-medium text-gray-500 mb-1">Imię i nazwisko</span>
                                        <span className="block text-gray-900">{client.name}</span>
                                    </div>
                                    <div>
                                        <span className="block text-sm font-medium text-gray-500 mb-1">Firma</span>
                                        <span className="block text-gray-900">{client.company_name || '—'} {client.company_nip ? `(NIP: ${client.company_nip})` : ''}</span>
                                    </div>
                                    <div>
                                        <span className="block text-sm font-medium text-gray-500 mb-1">Adres firmy</span>
                                        <span className="block text-gray-900 whitespace-pre-wrap">{client.company_address || '—'}</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <span className="block text-sm font-medium text-gray-500 mb-1">E-mail</span>
                                        <span className="block text-gray-900">{client.email || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-sm font-medium text-gray-500 mb-1">Telefon</span>
                                        <span className="block text-gray-900">{client.phone || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-sm font-medium text-gray-500 mb-1">Data dodania</span>
                                        <span className="block text-gray-900">{formatDate(client.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                            {client.notes && (
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <span className="block text-sm font-medium text-gray-500 mb-2">Notatki</span>
                                    <span className="block text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</span>
                                </div>
                            )}
                        </div>

                        {/* Offers List */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-900">Oferty klienta</h2>
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{offers.length}</span>
                            </div>

                            {offers.length === 0 ? (
                                <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                                    <p className="text-gray-500">Ten klient nie ma jeszcze przypisanych żadnych ofert.</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left font-medium text-gray-500">Oferta</th>
                                                <th className="px-6 py-3 text-left font-medium text-gray-500">Wartość netto</th>
                                                <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                                                <th className="px-6 py-3 text-left font-medium text-gray-500">Otwarto</th>
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
                                                                <span className="text-xs text-gray-600">{offer.view_count}×</span>
                                                            ) : (
                                                                <span className="text-xs text-gray-400">Nie otwarto</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-xs text-gray-500">
                                                            {formatDate(offer.created_at)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <Link
                                                                href={`/admin/offers/${offer.id}`}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
                                                            >
                                                                Szczegóły
                                                            </Link>
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
                )}
            </div>
        </div>
    )
}
