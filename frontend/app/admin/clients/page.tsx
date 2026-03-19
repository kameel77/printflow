'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useAuth } from '@/components/AuthProvider'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

interface ClientListItem {
    id: number
    name: string
    email: string | null
    phone: string | null
    company_name: string | null
    company_nip: string | null
    created_at: string
}

export default function ClientsPage() {
    const { user, logout } = useAuth()
    const [clients, setClients] = useState<ClientListItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('access_token')
        return token ? { Authorization: `Bearer ${token}` } : {}
    }, [])

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search)
        }, 300)
        return () => clearTimeout(handler)
    }, [search])

    const fetchClients = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params: any = {}
            if (debouncedSearch) params.q = debouncedSearch

            const res = await axios.get(`${API_URL}/clients`, {
                headers: getAuthHeaders(),
                params,
            })
            setClients(res.data)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Błąd ładowania klientów')
        } finally {
            setLoading(false)
        }
    }, [debouncedSearch, getAuthHeaders])

    useEffect(() => {
        fetchClients()
    }, [fetchClients])

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
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Klienci</h1>
                            <p className="text-sm text-gray-500 mt-1">Baza klientów i CRM</p>
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
                {/* Error */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
                )}

                {/* Search */}
                <div className="mb-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Szukaj klienta po nazwie, emailu lub firmie..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                        />
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                ) : clients.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-gray-500 mb-4">Brak klientów spełniających kryteria.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Imię i nazwisko</th>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Firma</th>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Kontakt</th>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Data dodania</th>
                                    <th className="px-6 py-3 text-right font-medium text-gray-500">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {clients.map((client) => (
                                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900">{client.name}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {client.company_name ? (
                                                <div>
                                                    <p className="font-medium text-gray-900">{client.company_name}</p>
                                                    {client.company_nip && <p className="text-xs text-gray-500">NIP: {client.company_nip}</p>}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {client.email && <p className="text-sm text-gray-600">{client.email}</p>}
                                                {client.phone && <p className="text-sm text-gray-600">{client.phone}</p>}
                                                {!client.email && !client.phone && <span className="text-gray-400">—</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {formatDate(client.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/admin/clients/${client.id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
                                            >
                                                Karta klienta
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
