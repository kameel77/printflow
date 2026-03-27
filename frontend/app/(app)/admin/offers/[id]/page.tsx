'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { useAuth } from '@/components/AuthProvider'
import Header from '@/components/Header'
import SendOfferModal from '@/components/SendOfferModal'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
const PUBLIC_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Szkic', color: 'bg-gray-100 text-gray-700' },
    SENT: { label: 'Wysłana', color: 'bg-blue-100 text-blue-700' },
    VIEWED: { label: 'Wyświetlona', color: 'bg-yellow-100 text-yellow-700' },
    ACCEPTED: { label: 'Zaakceptowana', color: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Odrzucona', color: 'bg-red-100 text-red-700' },
    EXPIRED: { label: 'Wygasła', color: 'bg-gray-200 text-gray-500' },
}

interface OfferFull {
    id: number
    token: string
    client: {
        id: number;
        name: string;
        email: string | null;
        phone: string | null;
        company_name: string | null;
        company_nip: string | null;
        company_address: string | null;
        company_street: string | null;
        company_postal_code: string | null;
        company_city: string | null;
        notes: string | null;
    } | null;
    user?: { id: number; full_name?: string; email: string } | null
    user_id: number | null
    status: string
    title: string | null
    internal_note: string | null
    valid_until: string | null
    client_comment: string | null
    accepted_variant_id: number | null
    sent_at: string | null
    viewed_at: string | null
    view_count: number
    responded_at: string | null
    created_at: string
    updated_at: string | null
    variants: Array<{
        id: number
        name: string
        is_recommended: boolean
        width_cm: number | null
        height_cm: number | null
        quantity: number | null
        total_price_net: number
        total_price_gross: number
        sort_order: number
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
    tracking_events: Array<{
        id: number
        event_type: string
        ip_address: string | null
        user_agent: string | null
        created_at: string
    }>
}

export default function OfferDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const [offer, setOffer] = useState<OfferFull | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isEditingClient, setIsEditingClient] = useState(false)
    const [editingClientData, setEditingClientData] = useState<any>(null)
    const [savingClient, setSavingClient] = useState(false)
    const [isSendModalOpen, setIsSendModalOpen] = useState(false)

    // Offer details editing
    const [isEditingOfferDetails, setIsEditingOfferDetails] = useState(false)
    const [editOfferTitle, setEditOfferTitle] = useState('')
    const [editValidDays, setEditValidDays] = useState('14')
    const [editInternalNote, setEditInternalNote] = useState('')
    const [savingOfferDetails, setSavingOfferDetails] = useState(false)

    // Change client
    const [isChangingClient, setIsChangingClient] = useState(false)
    const [clientSearch, setClientSearch] = useState('')
    const [clientResults, setClientResults] = useState<any[]>([])
    const [savingNewClient, setSavingNewClient] = useState(false)

    // Global Adjustment
    const [isAddingAdjustment, setIsAddingAdjustment] = useState(false)
    const [adjustmentName, setAdjustmentName] = useState('Korekta sumaryczna')
    const [adjustmentType, setAdjustmentType] = useState<'amount' | 'percentage'>('amount')
    const [adjustmentValue, setAdjustmentValue] = useState('')
    const [savingAdjustment, setSavingAdjustment] = useState(false)
    const [editingAdjustmentId, setEditingAdjustmentId] = useState<number | null>(null)

    const offerId = params?.id as string

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('access_token')
        return token ? { Authorization: `Bearer ${token}` } : {}
    }, [])

    const fetchOffer = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/offers/${offerId}`, { headers: getAuthHeaders() })
            setOffer(res.data)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Nie udało się załadować oferty')
        } finally {
            setLoading(false)
        }
    }, [offerId, getAuthHeaders])

    useEffect(() => { fetchOffer() }, [fetchOffer])

    // Client search
    useEffect(() => {
        if (clientSearch.length < 2) {
            setClientResults([])
            return
        }
        const timeoutId = setTimeout(async () => {
            try {
                const res = await axios.get(`${API_URL}/clients?search=${encodeURIComponent(clientSearch)}`, {
                    headers: getAuthHeaders(),
                })
                setClientResults(res.data)
            } catch (err) {
                console.error(err)
            }
        }, 300)
        return () => clearTimeout(timeoutId)
    }, [clientSearch, getAuthHeaders])

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 2 }).format(value)

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    const handleSend = async (message: string) => {
        try {
            await axios.post(`${API_URL}/offers/${offerId}/send`, { message }, { headers: getAuthHeaders() })
            fetchOffer()
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Błąd wysyłki')
            throw err
        }
    }

    const handleDuplicate = async () => {
        try {
            const res = await axios.post(`${API_URL}/offers/${offerId}/duplicate`, {}, { headers: getAuthHeaders() })
            router.push(`/admin/offers/${res.data.id}`)
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Błąd duplikowania')
        }
    }

    const handleEditClientClick = () => {
        if (offer?.client) {
            setEditingClientData({
                name: offer.client.name || '',
                email: offer.client.email || '',
                phone: offer.client.phone || '',
                company_name: offer.client.company_name || '',
                company_nip: offer.client.company_nip || '',
                company_address: offer.client.company_address || '',
                company_street: offer.client.company_street || '',
                company_postal_code: offer.client.company_postal_code || '',
                company_city: offer.client.company_city || '',
                notes: offer.client.notes || ''
            })
            setIsEditingClient(true)
        }
    }
    const handleSaveClient = async () => {
        if (!offer?.client) return
        setSavingClient(true)
        try {
            await axios.patch(`${API_URL}/clients/${offer.client.id}`, editingClientData, { headers: getAuthHeaders() })
            setIsEditingClient(false)
            fetchOffer()
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Błąd zapisu danych klienta')
        } finally {
            setSavingClient(false)
        }
    }

    const handleSelectNewClient = async (client: any) => {
        setSavingNewClient(true)
        try {
            await axios.patch(`${API_URL}/offers/${offerId}`, {
                client_id: client.id
            }, { headers: getAuthHeaders() })
            setIsChangingClient(false)
            setClientSearch('')
            fetchOffer()
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Błąd przypisania klienta')
        } finally {
            setSavingNewClient(false)
        }
    }

    const handleEditOfferDetailsClick = () => {
        if (offer) {
            setEditOfferTitle(offer.title || '')
            setEditInternalNote(offer.internal_note || '')
            if (offer.valid_until) {
                const days = Math.round((new Date(offer.valid_until).getTime() - Date.now()) / 86400000)
                setEditValidDays(String(Math.max(1, days)))
            } else {
                setEditValidDays('14')
            }
            setIsEditingOfferDetails(true)
        }
    }

    const handleSaveOfferDetails = async () => {
        setSavingOfferDetails(true)
        try {
            const validUntil = new Date()
            validUntil.setDate(validUntil.getDate() + parseInt(editValidDays || '14'))
            
            await axios.patch(`${API_URL}/offers/${offerId}`, {
                title: editOfferTitle,
                internal_note: editInternalNote,
                valid_until: validUntil.toISOString()
            }, { headers: getAuthHeaders() })
            
            setIsEditingOfferDetails(false)
            fetchOffer()
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Błąd zapisu szczegółów oferty')
        } finally {
            setSavingOfferDetails(false)
        }
    }

    const handleAddGlobalAdjustment = async () => {
        if (!offer || !adjustmentValue) return
        
        const val = parseFloat(adjustmentValue.replace(',', '.'))
        if (isNaN(val) || val === 0) return

        setSavingAdjustment(true)
        try {
            // Calculate current total net of existing standard variants to base % on
            const currentTotalNet = offer.variants.reduce((sum, v) => sum + Number(v.total_price_net), 0)
            const amountNet = adjustmentType === 'amount' ? val : currentTotalNet * (val / 100)
            const amountGross = amountNet * 1.23 // 23% VAT assumed

            const payload = {
                name: adjustmentName || 'Korekta',
                is_recommended: false,
                width_cm: null,
                height_cm: null,
                quantity: 1,
                total_price_net: amountNet,
                total_price_gross: amountGross,
                sort_order: 999, // push to bottom
                components: [
                    {
                        name_snapshot: adjustmentName || 'Korekta',
                        type: 'ADJUSTMENT',
                        quantity: 1,
                        unit: 'szt.',
                        unit_price: amountNet,
                        total_price: amountNet,
                        visible_to_client: true
                    }
                ],
                // pseudo-snapshot empty to avoid error
                calculation_snapshot: { is_global_adjustment: true } 
            }

            if (editingAdjustmentId) {
                // First delete the old adjustment
                await axios.delete(`${API_URL}/offers/${offerId}/variants/${editingAdjustmentId}`, {
                    headers: getAuthHeaders()
                })
            }

            await axios.post(`${API_URL}/offers/${offerId}/variants`, payload, {
                headers: getAuthHeaders()
            })
            
            setIsAddingAdjustment(false)
            setEditingAdjustmentId(null)
            setAdjustmentValue('')
            setAdjustmentName('Korekta sumaryczna')
            fetchOffer()
        } catch (err: any) {
            console.error(err)
            alert(err.response?.data?.detail || 'Błąd zapisu korekty')
        } finally {
            setSavingAdjustment(false)
        }
    }

    const cancelAdjustment = () => {
        setIsAddingAdjustment(false)
        setEditingAdjustmentId(null)
        setAdjustmentValue('')
        setAdjustmentName('Korekta sumaryczna')
        setAdjustmentType('amount')
    }

    const handleEditAdjustment = (variant: any) => {
        setEditingAdjustmentId(variant.id)
        setAdjustmentName(variant.name)
        setAdjustmentType('amount') // Re-edit always defaults to amount for simplicity, using the current total
        setAdjustmentValue(String(variant.total_price_net))
        setIsAddingAdjustment(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleEditVariant = (variant: any) => {
        if (!offer || !variant) return

        // Pull everything we can from calculation_snapshot
        const snap = variant.calculation_snapshot || {}

        const editData = {
            templateId: variant.template_id || snap.templateId || '',
            width: variant.width_cm ? String(Number(variant.width_cm)) : snap.width || '',
            height: variant.height_cm ? String(Number(variant.height_cm)) : snap.height || '',
            quantity: variant.quantity ? String(variant.quantity) : snap.quantity || '1',
            customerType: snap.customerType || 'B2C',
            selectedOptions: snap.selectedOptions || [],
            overlapOverride: snap.overlapOverride || '',
            adjustments: snap.adjustments || [],
        }

        sessionStorage.setItem('editOfferCalculation', JSON.stringify(editData))
        // Also carry the offer id so we can update it after re-calculation
        sessionStorage.setItem('editingOfferId', String(offer.id))
        sessionStorage.setItem('editingVariantId', String(variant.id))
        router.push('/') // Note: the default calculator is at the root or /admin/calculator depending on the routing.
    }

    const publicLink = offer ? `${PUBLIC_BASE}/offer/${offer.token}` : ''

    const copyLink = () => {
        navigator.clipboard.writeText(publicLink)
        alert('Link skopiowany do schowka')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        )
    }

    if (error || !offer) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error || 'Oferta nie znaleziona'}</p>
                    <Link href="/admin/offers" className="text-blue-600 hover:text-blue-700 font-medium">← Powrót do listy</Link>
                </div>
            </div>
        )
    }

    const statusCfg = STATUS_CONFIG[offer.status] || { label: offer.status, color: 'bg-gray-100 text-gray-700' }

    const variantsWithPrice = offer.variants || [];
    const totalNet = variantsWithPrice.reduce((sum, v) => sum + Number(v.total_price_net), 0);
    const totalGross = variantsWithPrice.reduce((sum, v) => sum + Number(v.total_price_gross), 0);
    const totalCogs = variantsWithPrice.reduce((sum, v) => {
        const snap = (v as any).calculation_snapshot || {};
        if (snap.is_global_adjustment) return sum;
        
        let cogs = 0;
        if (snap.result?.total_cost_cogs !== undefined) {
            cogs = Number(snap.result.total_cost_cogs);
        } else if (snap.total_cost_cogs !== undefined) {
            cogs = Number(snap.total_cost_cogs);
        } else {
            // Backward compatibility for old variants where COGS wasn't saved directly
            // Calculate backwards from margin_percentage and total_price_net
            // Margin = (Price - Cost) / Cost * 100 => Cost = Price / (1 + Margin/100)
            const marginPct = snap.finalMarginPercentage ?? snap.result?.margin_percentage ?? 0;
            const price = Number(v.total_price_net);
            cogs = price / (1 + (Number(marginPct) / 100));
        }
        
        return sum + cogs;
    }, 0);
    const marginVal = totalNet - totalCogs;
    const marginPct = totalCogs > 0 ? (marginVal / totalCogs) * 100 : (totalNet > 0 ? 100 : 0);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <Header
                title={
                    <div className="flex items-center gap-3">
                        <span>Oferta #{String(offer.id).padStart(3, '0')}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                    </div>
                }
                subtitle={offer.title || 'Bez tytułu'}
                backHref="/admin/offers"
                actions={
                    <>
                        {offer.status === 'DRAFT' && (
                            <button onClick={() => setIsSendModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors inline-flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                Wyślij
                            </button>
                        )}
                        <button onClick={handleDuplicate} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            Duplikuj
                        </button>
                        {offer.status === 'DRAFT' && (
                            <Link href={`/admin/offers/${offer.id}/edit`} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                Edytuj ofertę pełna
                            </Link>
                        )}
                        <button onClick={copyLink} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Kopiuj link
                        </button>
                    </>
                }
            />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Info grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Client */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-medium text-gray-500">Klient</h3>
                            {!isEditingClient && !isChangingClient && (
                                <div className="flex gap-2">
                                    {offer.client && <button onClick={handleEditClientClick} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Popraw dane</button>}
                                    {offer.status === 'DRAFT' && <button onClick={() => setIsChangingClient(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">{offer.client ? 'Zmień klienta' : 'Przypisz klienta'}</button>}
                                </div>
                            )}
                        </div>
                        {isChangingClient ? (
                            <div className="space-y-3">
                                <label className="block text-xs text-gray-500 mb-1">Wyszukaj i przypisz klienta</label>
                                <input
                                    type="text"
                                    value={clientSearch}
                                    onChange={(e) => setClientSearch(e.target.value)}
                                    placeholder="Wpisz nazwę, email lub NIP..."
                                    className="w-full text-sm border border-gray-300 rounded-lg py-2 pl-3 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {clientSearch.length > 2 && (
                                    <div className="border border-gray-200 rounded-md overflow-hidden bg-white max-h-48 overflow-y-auto">
                                        {clientResults.length === 0 ? (
                                            <div className="py-2 text-sm text-center text-gray-500">Brak wyników</div>
                                        ) : (
                                            <ul className="divide-y divide-gray-100">
                                                {clientResults.map(client => (
                                                    <li key={client.id}>
                                                        <button 
                                                            type="button" 
                                                            disabled={savingNewClient}
                                                            onClick={() => handleSelectNewClient(client)}
                                                            className="w-full text-left px-3 py-2 hover:bg-gray-50 focus:outline-none"
                                                        >
                                                            <div className="font-medium text-sm text-gray-900">{client.name}</div>
                                                            <div className="text-xs text-gray-500 flex gap-2">
                                                                {client.email && <span>{client.email}</span>}
                                                                {client.company_nip && <span>NIP: {client.company_nip}</span>}
                                                            </div>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => { setIsChangingClient(false); setClientSearch(''); }} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors w-full">Zakończ zmianę / Anuluj</button>
                                </div>
                            </div>
                        ) : offer.client ? (
                            isEditingClient ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Imię i nazwisko</label>
                                        <input type="text" value={editingClientData?.name} onChange={e => setEditingClientData({...editingClientData, name: e.target.value})} className="w-full text-sm border border-gray-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Firma</label>
                                        <input type="text" value={editingClientData?.company_name} onChange={e => setEditingClientData({...editingClientData, company_name: e.target.value})} className="w-full text-sm border border-gray-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">NIP</label>
                                        <input type="text" value={editingClientData?.company_nip} onChange={e => setEditingClientData({...editingClientData, company_nip: e.target.value})} className="w-full text-sm border border-gray-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"/>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs text-gray-500 mb-1">Ulica i numer</label>
                                            <input type="text" value={editingClientData.company_street || ''} onChange={e => setEditingClientData({...editingClientData, company_street: e.target.value})} className="w-full text-sm border border-gray-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Kod pocztowy</label>
                                            <input type="text" value={editingClientData.company_postal_code || ''} onChange={e => setEditingClientData({...editingClientData, company_postal_code: e.target.value})} className="w-full text-sm border border-gray-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Miejscowość</label>
                                            <input type="text" value={editingClientData.company_city || ''} onChange={e => setEditingClientData({...editingClientData, company_city: e.target.value})} className="w-full text-sm border border-gray-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"/>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs text-gray-500 mb-1">Notatki</label>
                                            <textarea rows={3} value={editingClientData.notes || ''} onChange={e => setEditingClientData({...editingClientData, notes: e.target.value})} className="w-full text-sm border border-gray-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"/>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Email</label>
                                        <input type="email" value={editingClientData?.email} onChange={e => setEditingClientData({...editingClientData, email: e.target.value})} className="w-full text-sm border border-gray-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Telefon</label>
                                        <input type="text" value={editingClientData?.phone} onChange={e => setEditingClientData({...editingClientData, phone: e.target.value})} className="w-full text-sm border border-gray-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"/>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button onClick={handleSaveClient} disabled={savingClient} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">{savingClient ? 'Zapisywanie...' : 'Zapisz'}</button>
                                        <button onClick={() => setIsEditingClient(false)} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">Anuluj</button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="font-semibold text-gray-900">{offer.client.name}</p>
                                    <p className="text-sm text-gray-600">{offer.client.email || '—'}</p>
                                    <p className="text-sm text-gray-600">{offer.client.phone || '—'}</p>
                                    {offer.client.company_name && <p className="text-sm text-gray-500 mt-1">{offer.client.company_name} {offer.client.company_nip ? `(NIP: ${offer.client.company_nip})` : ''}</p>}
                                    {(offer.client.company_street || offer.client.company_postal_code || offer.client.company_city || offer.client.company_address) && (
                                        <div className="mt-2">
                                            <span className="block text-sm font-medium text-gray-500 mb-1">Adres firmy</span>
                                            {offer.client.company_street || offer.client.company_city || offer.client.company_address ? (
                                                <span className="block text-gray-900 whitespace-pre-wrap">
                                                    {offer.client.company_street && <>{offer.client.company_street}<br/></>}
                                                    {(offer.client.company_postal_code || offer.client.company_city) && <>{offer.client.company_postal_code} {offer.client.company_city}<br/></>}
                                                    {offer.client.company_address && !offer.client.company_street && !offer.client.company_city && <>{offer.client.company_address}</>}
                                                </span>
                                            ) : (
                                                <span className="block text-gray-900">—</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        ) : (
                            <p className="text-gray-400">Brak danych klienta</p>
                        )}
                    </div>

                    {/* Tracking */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <h3 className="text-sm font-medium text-gray-500 mb-3">Tracking</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Wyświetlenia:</span>
                                <span className="font-semibold">{offer.view_count}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Wysłana:</span>
                                <span className="text-gray-900">{offer.sent_at ? formatDate(offer.sent_at) : '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Pierwsza wizyta:</span>
                                <span className="text-gray-900">{offer.viewed_at ? formatDate(offer.viewed_at) : '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Odpowiedź:</span>
                                <span className="text-gray-900">{offer.responded_at ? formatDate(offer.responded_at) : '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-medium text-gray-500">Szczegóły</h3>
                            {offer.status === 'DRAFT' && !isEditingOfferDetails && (
                                <button onClick={handleEditOfferDetailsClick} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Edytuj szczegóły</button>
                            )}
                        </div>
                        
                        {isEditingOfferDetails ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Tytuł oferty</label>
                                    <input type="text" value={editOfferTitle} onChange={e => setEditOfferTitle(e.target.value)} className="w-full text-sm border border-gray-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"/>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Ważność (dni)</label>
                                    <input type="number" value={editValidDays} onChange={e => setEditValidDays(e.target.value)} min="1" max="365" className="w-full text-sm border border-gray-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"/>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Notatka wewnętrzna</label>
                                    <textarea value={editInternalNote} onChange={e => setEditInternalNote(e.target.value)} rows={3} className="w-full text-sm border border-gray-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"/>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={handleSaveOfferDetails} disabled={savingOfferDetails} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors w-full">{savingOfferDetails ? 'Zapisywanie...' : 'Zapisz zamiany'}</button>
                                    <button onClick={() => setIsEditingOfferDetails(false)} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors w-full">Gotowe / Anuluj</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Ważna do:</span>
                                    <span className="text-gray-900">{offer.valid_until ? formatDate(offer.valid_until) : '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Utworzona:</span>
                                    <span className="text-gray-900">{formatDate(offer.created_at)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Przygotował(a):</span>
                                    <span className="text-gray-900">{offer.user ? offer.user.full_name || offer.user.email : 'Brak danych'}</span>
                                </div>
                                {offer.internal_note && (
                                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-yellow-800 text-xs">
                                        <strong>Notatka:</strong> {offer.internal_note}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Client comment */}
                {offer.client_comment && (
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Komentarz klienta</h3>
                        <p className="text-gray-900">{offer.client_comment}</p>
                    </div>
                )}

                {/* Variants -> Pozycje */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Kalkulacje / Pozycje {offer.variants.length > 0 ? `(${offer.variants.length})` : ''}</h3>
                        {offer.status === 'DRAFT' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsAddingAdjustment(true)}
                                    className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors inline-flex items-center gap-1.5"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    Dodaj rabat / koszt
                                </button>
                                <button
                                    onClick={() => router.push(`/?offerId=${offer.id}`)}
                                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    Dodaj nową kalkulację
                                </button>
                            </div>
                        )}
                    </div>

                    {isAddingAdjustment && (
                        <div className="mb-6 p-4 border border-purple-100 bg-purple-50/50 rounded-xl">
                            <h4 className="text-sm font-medium text-purple-900 mb-3">{editingAdjustmentId ? 'Edytuj korektę' : 'Dodaj korektę do zamówienia'}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Nazwa (np. Rabat stałego klienta)</label>
                                    <input type="text" value={adjustmentName} onChange={e => setAdjustmentName(e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" placeholder="Nazwa pozycji"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Typ</label>
                                    <select value={adjustmentType} onChange={e => setAdjustmentType(e.target.value as 'amount' | 'percentage')} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                                        <option value="amount">Kwota (PLN)</option>
                                        <option value="percentage">Procent (%)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Wartość (+/-)</label>
                                    <input type="number" step="0.01" value={adjustmentValue} onChange={e => setAdjustmentValue(e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" placeholder="-100 lub -10"/>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4 justify-end">
                                <button onClick={cancelAdjustment} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">Anuluj</button>
                                <button onClick={handleAddGlobalAdjustment} disabled={savingAdjustment || !adjustmentValue} className="px-4 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
                                    {savingAdjustment ? 'Zapisywanie...' : 'Zapisz korektę'}
                                </button>
                            </div>
                        </div>
                    )}

                    {offer.variants.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                            Brak przeliczonych pozycji w ofercie. Kliknij "Dodaj nową kalkulację", aby rozpocząć.
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                {offer.variants
                                    .sort((a, b) => a.sort_order - b.sort_order)
                                    .map((v, idx) => {
                                        const isAccepted = offer.accepted_variant_id === v.id
                                        return (
                                            <div key={v.id} className={`rounded-xl border-2 p-5 ${isAccepted ? 'border-green-300 bg-green-50/30' : v.is_recommended ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-200'}`}>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-sm font-bold text-gray-400">#{idx + 1}</span>
                                                            <h4 className="font-semibold text-gray-900">{v.name}</h4>
                                                            {v.is_recommended && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Polecany</span>}
                                                            {isAccepted && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">✓ Wybrany przez klienta</span>}
                                                        </div>
                                                        <div className="flex gap-4 text-sm text-gray-600 mt-1">
                                                            {v.width_cm && v.height_cm && <span>Wymiary: {Number(v.width_cm)}×{Number(v.height_cm)} cm</span>}
                                                            {v.quantity && <span>Ilość: {v.quantity} szt.</span>}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex flex-col items-end gap-2">
                                                        {offer.client?.company_name || offer.client?.company_nip ? (
                                                            <>
                                                                <div className="flex items-center gap-3 w-full justify-end">
                                                                    <div className="text-right">
                                                                        <p className="text-lg font-bold text-gray-900 leading-tight">
                                                                            {formatCurrency(Number(v.total_price_net))} <span className="text-xs font-normal text-gray-500">netto</span>
                                                                        </p>
                                                                        <p className="text-sm font-medium text-gray-600">
                                                                            {formatCurrency(Number(v.total_price_gross))} <span className="text-xs font-normal text-gray-500">brutto</span>
                                                                        </p>
                                                                    </div>
                                                                    {offer.status === 'DRAFT' && (
                                                                        (v as any).calculation_snapshot?.is_global_adjustment ? (
                                                                            <button
                                                                                onClick={() => handleEditAdjustment(v)}
                                                                                className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                                                                            >
                                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                                                Zmień kwotę
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => handleEditVariant(v)}
                                                                                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                                                                            >
                                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                                                Edytuj i zastąp w ofercie
                                                                            </button>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-3 w-full justify-end">
                                                                    <div className="text-right">
                                                                        <p className="text-lg font-bold text-gray-900 leading-tight">
                                                                            {formatCurrency(Number(v.total_price_gross))} <span className="text-xs font-normal text-gray-500">brutto</span>
                                                                        </p>
                                                                        <p className="text-sm font-medium text-gray-600">
                                                                            {formatCurrency(Number(v.total_price_net))} <span className="text-xs font-normal text-gray-500">netto</span>
                                                                        </p>
                                                                    </div>
                                                                    {offer.status === 'DRAFT' && (
                                                                        (v as any).calculation_snapshot?.is_global_adjustment ? (
                                                                            <button
                                                                                onClick={() => handleEditAdjustment(v)}
                                                                                className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                                                                            >
                                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                                                Zmień kwotę
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => handleEditVariant(v)}
                                                                                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                                                                            >
                                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                                                Edytuj i zastąp w ofercie
                                                                            </button>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                        <div className="mt-3 rounded-lg border overflow-hidden">
                                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left font-medium text-gray-500">Składnik</th>
                                                        <th className="px-4 py-2 text-left font-medium text-gray-500">Typ</th>
                                                        <th className="font-semibold text-gray-500 py-3 1/6 text-right w-32 border-b border-gray-100 uppercase tracking-widest text-[10px]">
                                                            Kwota netto
                                                        </th>
                                                        <th className="font-semibold text-gray-500 py-3 1/6 text-center w-16 border-b border-gray-100 pr-2">
                                                            <span className="flex items-center justify-center gap-1 text-gray-500" title="Czy pozycja jest widoczna dla klienta na kalkulacji">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                            </span>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {v.components.map((c) => (
                                                        <tr key={c.id} className={`${!c.visible_to_client ? 'opacity-50' : ''}`}>
                                                            <td className="px-4 py-2 text-gray-900">{c.name_snapshot}</td>
                                                            <td className="px-4 py-2">
                                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.type === 'MATERIAL' ? 'bg-purple-100 text-purple-700' : c.type === 'ADJUSTMENT' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                    {c.type === 'MATERIAL' ? 'Materiał' : c.type === 'ADJUSTMENT' ? 'Korekta' : 'Proces'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(c.total_price)}</td>
                                                            <td className="px-4 py-2 text-center">
                                                                {c.visible_to_client ? (
                                                                    <svg className="w-4 h-4 text-green-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                ) : (
                                                                    <svg className="w-4 h-4 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        
                        {offer.variants.length > 0 && (
                            <div className="mt-6 p-5 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-700 text-lg">Podsumowanie całej oferty:</h4>
                                    <div className="mt-1 flex items-center gap-3">
                                        <div className="px-3 py-1 bg-white border border-green-200 rounded-lg shadow-sm">
                                            <span className="text-xs text-green-700 font-medium tracking-wide uppercase">Zysk (Marża)</span>
                                            <p className="text-sm font-bold text-green-700">
                                                {formatCurrency(marginVal)} ({marginPct.toFixed(1)}%)
                                            </p>
                                        </div>
                                        <p className="text-xs text-gray-500">Widoczne tylko dla administratora</p>
                                    </div>
                                </div>
                                
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-gray-900 leading-tight">
                                        {formatCurrency(totalNet)} <span className="text-sm font-normal text-gray-500">netto</span>
                                    </p>
                                    <p className="text-sm font-medium text-gray-600 mt-1">
                                        {formatCurrency(totalGross)} <span className="text-xs font-normal text-gray-500">brutto</span>
                                    </p>
                                </div>
                            </div>
                        )}
                        </>
                    )}
                </div>

                {/* Tracking Events */}
                {offer.tracking_events.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Historia aktywności</h3>
                        <div className="space-y-2">
                            {offer.tracking_events
                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                .map((evt) => (
                                    <div key={evt.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-2 h-2 rounded-full ${evt.event_type === 'ACCEPTED' ? 'bg-green-500' :
                                                evt.event_type === 'REJECTED' ? 'bg-red-500' :
                                                    evt.event_type === 'LINK_CLICKED' ? 'bg-blue-500' :
                                                        'bg-gray-400'
                                                }`} />
                                            <span className="text-sm text-gray-900">
                                                {evt.event_type === 'LINK_CLICKED' ? 'Wyświetlenie oferty' :
                                                    evt.event_type === 'EMAIL_OPENED' ? 'Otwarcie emaila' :
                                                        evt.event_type === 'ACCEPTED' ? 'Akceptacja oferty' :
                                                            evt.event_type === 'REJECTED' ? 'Odrzucenie oferty' :
                                                                evt.event_type}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">{formatDate(evt.created_at)}</p>
                                            {evt.ip_address && <p className="text-xs text-gray-400">{evt.ip_address}</p>}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Public link */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Link publiczny</h3>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 truncate">{publicLink}</code>
                        <button onClick={copyLink} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">
                            Kopiuj
                        </button>
                    </div>
                </div>
            </div>

            <SendOfferModal
                isOpen={isSendModalOpen}
                onClose={() => setIsSendModalOpen(false)}
                onSend={handleSend}
                clientName={offer.client?.name || offer.client?.company_name || undefined}
            />
        </div>
    )
}
