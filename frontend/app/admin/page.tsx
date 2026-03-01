'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import Link from 'next/link'
import { Tooltip, LabelWithTooltip } from '../../components/Tooltip'
import { useAuth } from '@/components/AuthProvider'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

// ────────── Types ──────────
interface MaterialVariant {
    id?: number
    material_id?: number
    width_cm: number | null
    length_cm?: number | null
    cost_price_per_unit: number
    markup_percentage: number
    unit: string
    margin_w_cm: number
    margin_h_cm: number
    is_active: boolean
    tooltip_margin_w_cm?: string | null
    tooltip_margin_h_cm?: string | null
    tooltip_markup_percentage?: string | null
}

interface Material {
    id: number
    name: string
    category: string | null
    description: string | null
    variants: MaterialVariant[]
    created_at: string
}

interface ProcessItem {
    id: number
    name: string
    method: string
    unit_price: number
    setup_fee: number
    internal_cost: number | null
    margin_w_cm: number
    margin_h_cm: number
    unit: string | null
    is_active: boolean
    tooltip_method?: string | null
    tooltip_unit_price?: string | null
    tooltip_setup_fee?: string | null
    tooltip_internal_cost?: string | null
    tooltip_margin_w_cm?: string | null
    tooltip_margin_h_cm?: string | null
}

interface TemplateComponent {
    id?: number
    template_id?: number
    material_id: number | null
    process_id: number | null
    is_required: boolean
    group_name: string | null
    option_label: string | null
    sort_order: number
}

interface Template {
    id: number
    name: string
    description: string | null
    default_margin_w_cm: number
    default_margin_h_cm: number
    default_overlap_cm: number
    is_active: boolean
    components: TemplateComponent[]
    tooltip_margin_w_cm?: string | null
    tooltip_margin_h_cm?: string | null
    tooltip_overlap_cm?: string | null
}

interface UserItem {
    id: number
    email: string
    full_name: string | null
    role: string
    is_active: boolean
    google_id: string | null
}

// ────────── Tab types ──────────
type TabId = 'templates' | 'materials' | 'processes' | 'users'

// ────────── Main Component ──────────
export default function AdminPage() {
    const { user, logout } = useAuth()
    const [activeTab, setActiveTab] = useState<TabId>('templates')
    const [templates, setTemplates] = useState<Template[]>([])
    const [materials, setMaterials] = useState<Material[]>([])
    const [processes, setProcesses] = useState<ProcessItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [users, setUsers] = useState<UserItem[]>([])

    // Modal state — Templates
    const [showModal, setShowModal] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

    // Modal state — Materials
    const [showMaterialModal, setShowMaterialModal] = useState(false)
    const [showMaterialCSVModal, setShowMaterialCSVModal] = useState(false)
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

    // Modal state — Processes
    const [showProcessModal, setShowProcessModal] = useState(false)
    const [editingProcess, setEditingProcess] = useState<ProcessItem | null>(null)

    const fetchAll = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const token = localStorage.getItem('access_token')
            const headers = token ? { Authorization: `Bearer ${token}` } : {}
            const [tRes, mRes, pRes, uRes] = await Promise.all([
                axios.get(`${API_URL}/templates`),
                axios.get(`${API_URL}/materials`),
                axios.get(`${API_URL}/processes`),
                axios.get(`${API_URL}/users`, { headers }).catch(() => ({ data: [] })),
            ])
            setTemplates(tRes.data)
            setMaterials(mRes.data)
            setProcesses(pRes.data)
            setUsers(uRes.data)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Błąd ładowania danych')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAll()
    }, [fetchAll])

    const handleDeleteTemplate = async (id: number) => {
        if (!confirm('Czy na pewno chcesz usunąć ten szablon?')) return
        try {
            await axios.delete(`${API_URL}/templates/${id}`)
            setTemplates((prev) => prev.filter((t) => t.id !== id))
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Błąd usuwania')
        }
    }

    const handleDeleteMaterial = async (id: number) => {
        if (!confirm('Czy na pewno chcesz usunąć ten materiał?')) return
        try {
            await axios.delete(`${API_URL}/materials/${id}`)
            setMaterials((prev) => prev.filter((m) => m.id !== id))
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Błąd usuwania')
        }
    }

    const handleDeleteProcess = async (id: number) => {
        if (!confirm('Czy na pewno chcesz usunąć ten proces?')) return
        try {
            await axios.delete(`${API_URL}/processes/${id}`)
            setProcesses((prev) => prev.filter((p) => p.id !== id))
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Błąd usuwania')
        }
    }

    const openCreateTemplate = () => {
        setEditingTemplate(null)
        setShowModal(true)
    }

    const openEditTemplate = (template: Template) => {
        setEditingTemplate(template)
        setShowModal(true)
    }

    const handleSaveTemplate = async (data: any) => {
        try {
            if (editingTemplate) {
                await axios.put(`${API_URL}/templates/${editingTemplate.id}`, data)
            } else {
                await axios.post(`${API_URL}/templates`, data)
            }
            setShowModal(false)
            fetchAll()
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Błąd zapisu')
        }
    }

    // ── Material CRUD ──
    const openCreateMaterial = () => { setEditingMaterial(null); setShowMaterialModal(true) }
    const openEditMaterial = (m: Material) => { setEditingMaterial(m); setShowMaterialModal(true) }
    const handleSaveMaterial = async (data: any) => {
        try {
            if (editingMaterial) {
                await axios.put(`${API_URL}/materials/${editingMaterial.id}`, data)
            } else {
                await axios.post(`${API_URL}/materials`, data)
            }
            setShowMaterialModal(false)
            fetchAll()
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Błąd zapisu')
        }
    }

    // ── Process CRUD ──
    const openCreateProcess = () => { setEditingProcess(null); setShowProcessModal(true) }
    const openEditProcess = (p: ProcessItem) => { setEditingProcess(p); setShowProcessModal(true) }
    const handleSaveProcess = async (data: any) => {
        try {
            if (editingProcess) {
                await axios.put(`${API_URL}/processes/${editingProcess.id}`, data)
            } else {
                await axios.post(`${API_URL}/processes`, data)
            }
            setShowProcessModal(false)
            fetchAll()
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Błąd zapisu')
        }
    }

    // ── User management ──
    const handleToggleUserActive = async (userId: number, isActive: boolean) => {
        try {
            const token = localStorage.getItem('access_token')
            await axios.patch(`${API_URL}/users/${userId}`, { is_active: isActive }, {
                headers: { Authorization: `Bearer ${token}` },
            })
            setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: isActive } : u))
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Błąd aktualizacji')
        }
    }

    const handleChangeUserRole = async (userId: number, role: string) => {
        try {
            const token = localStorage.getItem('access_token')
            await axios.patch(`${API_URL}/users/${userId}`, { role }, {
                headers: { Authorization: `Bearer ${token}` },
            })
            setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u))
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Błąd aktualizacji')
        }
    }

    const handleDeleteUser = async (userId: number) => {
        if (!confirm('Czy na pewno chcesz usunąć tego użytkownika?')) return
        try {
            const token = localStorage.getItem('access_token')
            await axios.delete(`${API_URL}/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            setUsers((prev) => prev.filter((u) => u.id !== userId))
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Błąd usuwania')
        }
    }

    const allTabs: { id: TabId; label: string; count: number }[] = [
        { id: 'templates', label: 'Szablony', count: templates.length },
        { id: 'materials', label: 'Materiały', count: materials.length },
        { id: 'processes', label: 'Procesy', count: processes.length },
        { id: 'users', label: 'Użytkownicy', count: users.length },
    ]

    const tabs = allTabs.filter(tab => tab.id !== 'users' || user?.role === 'ADMIN')

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Panel Administracyjny</h1>
                            <p className="text-sm text-gray-500 mt-1">Zarządzanie szablonami, materiałami i procesami</p>
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
                            {user && (
                                <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
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
                {/* Error banner */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex items-center gap-1 mb-6 bg-white rounded-xl shadow-sm border p-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {tab.label}
                            <span
                                className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-blue-500 text-blue-100' : 'bg-gray-200 text-gray-600'
                                    }`}
                            >
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                ) : (
                    <>
                        {/* Templates Tab */}
                        {activeTab === 'templates' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900">Szablony produktów</h2>
                                    <button
                                        onClick={openCreateTemplate}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Dodaj szablon
                                    </button>
                                </div>

                                {templates.length === 0 ? (
                                    <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                                        <p className="text-gray-500">Brak szablonów. Kliknij &quot;Dodaj szablon&quot; aby utworzyć pierwszy.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {templates.map((t) => (
                                            <div key={t.id} className="bg-white rounded-xl shadow-sm border p-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <h3 className="text-lg font-semibold text-gray-900">{t.name}</h3>
                                                            <span
                                                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                                                    }`}
                                                            >
                                                                {t.is_active ? 'Aktywny' : 'Nieaktywny'}
                                                            </span>
                                                        </div>
                                                        {t.description && (
                                                            <p className="text-sm text-gray-500 mt-1">{t.description}</p>
                                                        )}
                                                        <div className="flex gap-6 mt-3 text-sm text-gray-600">
                                                            <span>Margines: {Number(t.default_margin_w_cm)}×{Number(t.default_margin_h_cm)} cm</span>
                                                            <span>Zakładka: {Number(t.default_overlap_cm)} cm</span>
                                                            <span>Komponenty: {t.components.length}</span>
                                                        </div>

                                                        {/* Component list */}
                                                        {t.components.length > 0 && (
                                                            <div className="mt-4 space-y-1">
                                                                {t.components
                                                                    .sort((a, b) => a.sort_order - b.sort_order)
                                                                    .map((c, i) => {
                                                                        const name = c.material_id
                                                                            ? materials.find((m) => m.id === c.material_id)?.name || `Materiał #${c.material_id}`
                                                                            : processes.find((p) => p.id === c.process_id)?.name || `Proces #${c.process_id}`
                                                                        const type = c.material_id ? 'Materiał' : 'Proces'
                                                                        return (
                                                                            <div key={i} className="flex items-center gap-2 text-sm">
                                                                                <span
                                                                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.material_id
                                                                                        ? 'bg-purple-100 text-purple-700'
                                                                                        : 'bg-orange-100 text-orange-700'
                                                                                        }`}
                                                                                >
                                                                                    {type}
                                                                                </span>
                                                                                <span className="text-gray-700">{name}</span>
                                                                                {!c.is_required && (
                                                                                    <span className="text-xs text-gray-400">(opcjonalny)</span>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    })}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 ml-4">
                                                        <button
                                                            onClick={() => openEditTemplate(t)}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Edytuj"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTemplate(t.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Usuń"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Materials Tab */}
                        {activeTab === 'materials' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900">Materiały</h2>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowMaterialCSVModal(true)}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Import z CSV
                                        </button>
                                        <button
                                            onClick={openCreateMaterial}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Dodaj materiał
                                        </button>
                                    </div>
                                </div>

                                {materials.length === 0 ? (
                                    <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                                        <p className="text-gray-500">Brak materiałów w bazie danych.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {materials.map((m) => (
                                            <div key={m.id} className="bg-white rounded-xl shadow-sm border p-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <h3 className="text-lg font-semibold text-gray-900">{m.name}</h3>
                                                            {m.category && (
                                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                                    {m.category}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {m.description && (
                                                            <p className="text-sm text-gray-500 mt-1">{m.description}</p>
                                                        )}
                                                        {m.variants.length > 0 && (
                                                            <div className="mt-3 rounded-lg border">
                                                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                                    <thead className="bg-gray-50">
                                                                        <tr>
                                                                            <th className="px-4 py-2 text-left font-medium text-gray-500">Szer. (cm)</th>
                                                                            <th className="px-4 py-2 text-left font-medium text-gray-500">Cena/jedn.</th>
                                                                            <th className="px-4 py-2 text-left font-medium text-gray-500">
                                                                                <span className="inline-flex items-center gap-1">
                                                                                    Narzut %
                                                                                    {m.variants[0]?.tooltip_markup_percentage && (
                                                                                        <Tooltip text={m.variants[0].tooltip_markup_percentage}>
                                                                                            <button type="button" className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help">
                                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                                            </button>
                                                                                        </Tooltip>
                                                                                    )}
                                                                                </span>
                                                                            </th>
                                                                            <th className="px-4 py-2 text-left font-medium text-gray-500">
                                                                                <span className="inline-flex items-center gap-1">
                                                                                    Margines W
                                                                                    {m.variants[0]?.tooltip_margin_w_cm && (
                                                                                        <Tooltip text={m.variants[0].tooltip_margin_w_cm}>
                                                                                            <button type="button" className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help">
                                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                                            </button>
                                                                                        </Tooltip>
                                                                                    )}
                                                                                </span>
                                                                            </th>
                                                                            <th className="px-4 py-2 text-left font-medium text-gray-500">Jedn.</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100">
                                                                        {m.variants.map((v, i) => (
                                                                            <tr key={i}>
                                                                                <td className="px-4 py-2 text-gray-900">{v.width_cm ?? '—'}</td>
                                                                                <td className="px-4 py-2 text-gray-900">{Number(v.cost_price_per_unit).toFixed(2)} zł</td>
                                                                                <td className="px-4 py-2 text-gray-900">{Number(v.markup_percentage)}%</td>
                                                                                <td className="px-4 py-2 text-gray-900">{Number(v.margin_w_cm)} cm</td>
                                                                                <td className="px-4 py-2 text-gray-900">{v.unit}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-4">
                                                        <button
                                                            onClick={() => openEditMaterial(m)}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Edytuj"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteMaterial(m.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Usuń"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Processes Tab */}
                        {activeTab === 'processes' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900">Procesy</h2>
                                    <button
                                        onClick={openCreateProcess}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Dodaj proces
                                    </button>
                                </div>

                                {processes.length === 0 ? (
                                    <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                                        <p className="text-gray-500">Brak procesów w bazie danych.</p>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl shadow-sm border">
                                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Nazwa</th>
                                                    <th className="px-6 py-3 text-left font-medium text-gray-500">
                                                        <span className="inline-flex items-center gap-1">
                                                            Metoda
                                                            {processes[0]?.tooltip_method && (
                                                                <Tooltip text={processes[0].tooltip_method}>
                                                                    <button type="button" className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                    </button>
                                                                </Tooltip>
                                                            )}
                                                        </span>
                                                    </th>
                                                    <th className="px-6 py-3 text-left font-medium text-gray-500">
                                                        <span className="inline-flex items-center gap-1">
                                                            Cena/jedn.
                                                            {processes[0]?.tooltip_unit_price && (
                                                                <Tooltip text={processes[0].tooltip_unit_price}>
                                                                    <button type="button" className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                    </button>
                                                                </Tooltip>
                                                            )}
                                                        </span>
                                                    </th>
                                                    <th className="px-6 py-3 text-left font-medium text-gray-500">
                                                        <span className="inline-flex items-center gap-1">
                                                            Opłata startowa
                                                            {processes[0]?.tooltip_setup_fee && (
                                                                <Tooltip text={processes[0].tooltip_setup_fee}>
                                                                    <button type="button" className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                    </button>
                                                                </Tooltip>
                                                            )}
                                                        </span>
                                                    </th>
                                                    <th className="px-6 py-3 text-left font-medium text-gray-500">
                                                        <span className="inline-flex items-center gap-1">
                                                            Koszt wewn.
                                                            {processes[0]?.tooltip_internal_cost && (
                                                                <Tooltip text={processes[0].tooltip_internal_cost}>
                                                                    <button type="button" className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                    </button>
                                                                </Tooltip>
                                                            )}
                                                        </span>
                                                    </th>
                                                    <th className="px-6 py-3 text-left font-medium text-gray-500">
                                                        <span className="inline-flex items-center gap-1">
                                                            Margines
                                                            {processes[0]?.tooltip_margin_w_cm && (
                                                                <Tooltip text={processes[0].tooltip_margin_w_cm}>
                                                                    <button type="button" className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                    </button>
                                                                </Tooltip>
                                                            )}
                                                        </span>
                                                    </th>
                                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                                                    <th className="px-6 py-3 text-right font-medium text-gray-500">Akcje</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {processes.map((p) => (
                                                    <tr key={p.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                                                {p.method}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-900">{Number(p.unit_price).toFixed(2)} zł/{p.unit || 'szt'}</td>
                                                        <td className="px-6 py-4 text-gray-600">{Number(p.setup_fee).toFixed(2)} zł</td>
                                                        <td className="px-6 py-4 text-gray-600">{p.internal_cost ? `${Number(p.internal_cost).toFixed(2)} zł` : '—'}</td>
                                                        <td className="px-6 py-4 text-gray-600">{Number(p.margin_w_cm)}×{Number(p.margin_h_cm)} cm</td>
                                                        <td className="px-6 py-4">
                                                            <span
                                                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                                                    }`}
                                                            >
                                                                {p.is_active ? 'Aktywny' : 'Nieaktywny'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="inline-flex items-center gap-1">
                                                                <button
                                                                    onClick={() => openEditProcess(p)}
                                                                    className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                                                    title="Edytuj"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteProcess(p.id)}
                                                                    className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                                                    title="Usuń"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Users Tab */}
                        {activeTab === 'users' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900">Użytkownicy</h2>
                                </div>

                                {users.length === 0 ? (
                                    <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                                        <p className="text-gray-500">Brak użytkowników w systemie.</p>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl shadow-sm border">
                                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Użytkownik</th>
                                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Rola</th>
                                                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                                                    <th className="px-6 py-3 text-right font-medium text-gray-500">Akcje</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {users.map((u) => (
                                                    <tr key={u.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4">
                                                            <div>
                                                                <p className="font-medium text-gray-900">{u.full_name || '—'}</p>
                                                                <p className="text-gray-500 text-xs">{u.email}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <select
                                                                value={u.role}
                                                                onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                                                                disabled={u.id === user?.id}
                                                                className="px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                                            >
                                                                <option value="admin">Admin</option>
                                                                <option value="sales">Sales</option>
                                                                <option value="production">Production</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <button
                                                                onClick={() => handleToggleUserActive(u.id, !u.is_active)}
                                                                disabled={u.id === user?.id}
                                                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${u.is_active
                                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                            >
                                                                {u.is_active ? 'Aktywny' : 'Nieaktywny'}
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => handleDeleteUser(u.id)}
                                                                disabled={u.id === user?.id}
                                                                className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                title="Usuń"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Template Create/Edit Modal */}
            {showModal && (
                <TemplateModal
                    template={editingTemplate}
                    materials={materials}
                    processes={processes}
                    onSave={handleSaveTemplate}
                    onClose={() => setShowModal(false)}
                />
            )}

            {/* Material Create/Edit Modal */}
            {showMaterialModal && (
                <MaterialModal
                    material={editingMaterial}
                    onSave={handleSaveMaterial}
                    onClose={() => setShowMaterialModal(false)}
                />
            )}

            {/* Material CSV Import Modal */}
            {showMaterialCSVModal && (
                <MaterialCSVImportModal
                    onClose={() => setShowMaterialCSVModal(false)}
                    onSuccess={() => {
                        setShowMaterialCSVModal(false)
                        fetchAll()
                    }}
                />
            )}

            {/* Process Create/Edit Modal */}
            {showProcessModal && (
                <ProcessModal
                    process={editingProcess}
                    onSave={handleSaveProcess}
                    onClose={() => setShowProcessModal(false)}
                />
            )}
        </div>
    )
}

// ────────── Template Create/Edit Modal ──────────
function TemplateModal({
    template,
    materials,
    processes,
    onSave,
    onClose,
}: {
    template: Template | null
    materials: Material[]
    processes: ProcessItem[]
    onSave: (data: any) => void
    onClose: () => void
}) {
    const [name, setName] = useState(template?.name || '')
    const [description, setDescription] = useState(template?.description || '')
    const [marginW, setMarginW] = useState(String(template ? Number(template.default_margin_w_cm) : '0.5'))
    const [marginH, setMarginH] = useState(String(template ? Number(template.default_margin_h_cm) : '0.5'))
    const [overlap, setOverlap] = useState(String(template ? Number(template.default_overlap_cm) : '1.0'))
    const [isActive, setIsActive] = useState(template?.is_active ?? true)
    const [components, setComponents] = useState<
        { type: 'material' | 'process'; refId: string; isRequired: boolean; sortOrder: number }[]
    >(
        template?.components.map((c) => ({
            type: c.material_id ? 'material' : 'process',
            refId: String(c.material_id || c.process_id || ''),
            isRequired: c.is_required,
            sortOrder: c.sort_order,
        })) || []
    )
    const [saving, setSaving] = useState(false)

    const addComponent = () => {
        setComponents((prev) => [
            ...prev,
            {
                type: 'material',
                refId: materials[0]?.id ? String(materials[0].id) : '',
                isRequired: true,
                sortOrder: prev.length,
            },
        ])
    }

    const removeComponent = (index: number) => {
        setComponents((prev) => prev.filter((_, i) => i !== index))
    }

    const updateComponent = (index: number, field: string, value: any) => {
        setComponents((prev) =>
            prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const payload: any = {
            name,
            description: description || null,
            default_margin_w_cm: parseFloat(marginW),
            default_margin_h_cm: parseFloat(marginH),
            default_overlap_cm: parseFloat(overlap),
            is_active: isActive,
            components: components.map((c) => ({
                material_id: c.type === 'material' ? parseInt(c.refId) : null,
                process_id: c.type === 'process' ? parseInt(c.refId) : null,
                is_required: c.isRequired,
                sort_order: c.sortOrder,
            })),
        }

        await onSave(payload)
        setSaving(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {template ? 'Edytuj szablon' : 'Nowy szablon'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="np. Fototapeta Lateksowa"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Opcjonalny opis szablonu"
                            />
                        </div>
                    </div>

                    {/* Parameters */}
                    <div className="grid grid-cols-3 gap-4">
                        <LabelWithTooltip label="Margines W (cm)" tooltipText={template?.tooltip_margin_w_cm}>
                            <input
                                type="number"
                                value={marginW}
                                onChange={(e) => setMarginW(e.target.value)}
                                step="0.1"
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </LabelWithTooltip>
                        <LabelWithTooltip label="Margines H (cm)" tooltipText={template?.tooltip_margin_h_cm}>
                            <input
                                type="number"
                                value={marginH}
                                onChange={(e) => setMarginH(e.target.value)}
                                step="0.1"
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </LabelWithTooltip>
                        <LabelWithTooltip label="Zakładka (cm)" tooltipText={template?.tooltip_overlap_cm}>
                            <input
                                type="number"
                                value={overlap}
                                onChange={(e) => setOverlap(e.target.value)}
                                step="0.1"
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </LabelWithTooltip>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                            Aktywny
                        </label>
                    </div>

                    {/* Components */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Komponenty</h3>
                            <button
                                type="button"
                                onClick={addComponent}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Dodaj komponent
                            </button>
                        </div>

                        {components.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">
                                Brak komponentów. Dodaj materiały i procesy do szablonu.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {components.map((comp, index) => (
                                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <span className="text-xs text-gray-400 font-mono w-6 text-center">
                                            {index + 1}
                                        </span>
                                        <select
                                            value={comp.type}
                                            onChange={(e) => {
                                                updateComponent(index, 'type', e.target.value)
                                                const firstId = e.target.value === 'material'
                                                    ? (materials[0]?.id ? String(materials[0].id) : '')
                                                    : (processes[0]?.id ? String(processes[0].id) : '')
                                                updateComponent(index, 'refId', firstId)
                                            }}
                                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                                        >
                                            <option value="material">Materiał</option>
                                            <option value="process">Proces</option>
                                        </select>
                                        <select
                                            value={comp.refId}
                                            onChange={(e) => updateComponent(index, 'refId', e.target.value)}
                                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                                        >
                                            {comp.type === 'material'
                                                ? materials.map((m) => (
                                                    <option key={m.id} value={String(m.id)}>
                                                        {m.name}
                                                    </option>
                                                ))
                                                : processes.map((p) => (
                                                    <option key={p.id} value={String(p.id)}>
                                                        {p.name}
                                                    </option>
                                                ))}
                                        </select>
                                        <label className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={comp.isRequired}
                                                onChange={(e) => updateComponent(index, 'isRequired', e.target.checked)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            Wymagany
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => removeComponent(index)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Anuluj
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !name}
                            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {saving ? 'Zapisywanie...' : template ? 'Zapisz zmiany' : 'Utwórz szablon'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ────────── Material Create/Edit Modal ──────────
function MaterialModal({
    material,
    onSave,
    onClose,
}: {
    material: Material | null
    onSave: (data: any) => void
    onClose: () => void
}) {
    const [name, setName] = useState(material?.name || '')
    const [category, setCategory] = useState(material?.category || '')
    const [description, setDescription] = useState(material?.description || '')
    const [variants, setVariants] = useState<{
        width_cm: string
        length_cm: string
        cost_price_per_unit: string
        markup_percentage: string
        unit: string
        margin_w_cm: string
        margin_h_cm: string
        is_active: boolean
        tooltip_markup_percentage: string
        tooltip_margin_w_cm: string
        tooltip_margin_h_cm: string
    }[]>(
        material?.variants.map((v) => ({
            width_cm: v.width_cm != null ? String(v.width_cm) : '',
            length_cm: v.length_cm != null ? String(v.length_cm) : '',
            cost_price_per_unit: String(Number(v.cost_price_per_unit)),
            markup_percentage: String(Number(v.markup_percentage)),
            unit: v.unit,
            margin_w_cm: String(Number(v.margin_w_cm)),
            margin_h_cm: String(Number(v.margin_h_cm)),
            is_active: v.is_active,
            tooltip_markup_percentage: v.tooltip_markup_percentage || '',
            tooltip_margin_w_cm: v.tooltip_margin_w_cm || '',
            tooltip_margin_h_cm: v.tooltip_margin_h_cm || '',
        })) || [{ width_cm: '', length_cm: '', cost_price_per_unit: '0', markup_percentage: '0', unit: 'm2', margin_w_cm: '0', margin_h_cm: '0', is_active: true, tooltip_markup_percentage: '', tooltip_margin_w_cm: '', tooltip_margin_h_cm: '' }]
    )
    const [saving, setSaving] = useState(false)

    const addVariant = () => {
        setVariants((prev) => [...prev, { width_cm: '', length_cm: '', cost_price_per_unit: '0', markup_percentage: '0', unit: 'm2', margin_w_cm: '0', margin_h_cm: '0', is_active: true, tooltip_markup_percentage: '', tooltip_margin_w_cm: '', tooltip_margin_h_cm: '' }])
    }

    const removeVariant = (index: number) => {
        setVariants((prev) => prev.filter((_, i) => i !== index))
    }

    const updateVariant = (index: number, field: string, value: any) => {
        setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const payload = {
            name,
            category: category || null,
            description: description || null,
            variants: variants.map((v) => ({
                width_cm: v.width_cm ? parseFloat(v.width_cm) : null,
                length_cm: v.length_cm ? parseFloat(v.length_cm) : null,
                cost_price_per_unit: parseFloat(v.cost_price_per_unit),
                markup_percentage: parseFloat(v.markup_percentage),
                unit: v.unit,
                margin_w_cm: parseFloat(v.margin_w_cm),
                margin_h_cm: parseFloat(v.margin_h_cm),
                is_active: v.is_active,
                tooltip_markup_percentage: v.tooltip_markup_percentage || null,
                tooltip_margin_w_cm: v.tooltip_margin_w_cm || null,
                tooltip_margin_h_cm: v.tooltip_margin_h_cm || null,
            })),
        }
        await onSave(payload)
        setSaving(false)
    }

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {material ? 'Edytuj materiał' : 'Nowy materiał'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa *</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="np. Papier Lateksowy" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kategoria</label>
                            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} placeholder="np. Papier" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} placeholder="Opcjonalny opis" />
                    </div>

                    {/* Variants */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Warianty</h3>
                            <button type="button" onClick={addVariant} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Dodaj wariant
                            </button>
                        </div>

                        {variants.map((v, index) => (
                            <div key={index} className="p-4 bg-gray-50 rounded-lg mb-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500">Wariant {index + 1}</span>
                                    {variants.length > 1 && (
                                        <button type="button" onClick={() => removeVariant(index)} className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Szer. (cm)</label>
                                        <input type="number" value={v.width_cm} onChange={(e) => updateVariant(index, 'width_cm', e.target.value)} step="0.1" className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Cena/jedn.</label>
                                        <input type="number" value={v.cost_price_per_unit} onChange={(e) => updateVariant(index, 'cost_price_per_unit', e.target.value)} step="0.01" required className={inputClass} />
                                    </div>
                                    <div>
                                        <LabelWithTooltip label="Narzut %" tooltipText={v.tooltip_markup_percentage || undefined}>
                                            <input type="number" value={v.markup_percentage} onChange={(e) => updateVariant(index, 'markup_percentage', e.target.value)} step="0.1" className={inputClass} />
                                        </LabelWithTooltip>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Jedn.</label>
                                        <select value={v.unit} onChange={(e) => updateVariant(index, 'unit', e.target.value)} className={inputClass}>
                                            <option value="m2">m²</option>
                                            <option value="mb">mb</option>
                                            <option value="szt">szt</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    <div>
                                        <LabelWithTooltip label="Margines W (cm)" tooltipText={v.tooltip_margin_w_cm || undefined}>
                                            <input type="number" value={v.margin_w_cm} onChange={(e) => updateVariant(index, 'margin_w_cm', e.target.value)} step="0.1" className={inputClass} />
                                        </LabelWithTooltip>
                                    </div>
                                    <div>
                                        <LabelWithTooltip label="Margines H (cm)" tooltipText={v.tooltip_margin_h_cm || undefined}>
                                            <input type="number" value={v.margin_h_cm} onChange={(e) => updateVariant(index, 'margin_h_cm', e.target.value)} step="0.1" className={inputClass} />
                                        </LabelWithTooltip>
                                    </div>
                                    <div className="col-span-2 flex items-end">
                                        <label className="flex items-center gap-2 text-sm text-gray-600">
                                            <input type="checkbox" checked={v.is_active} onChange={(e) => updateVariant(index, 'is_active', e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                            Aktywny
                                        </label>
                                    </div>
                                </div>
                                {/* Tooltip fields */}
                                <details className="text-xs">
                                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium">Tooltipy (opisy pól)</summary>
                                    <div className="grid grid-cols-3 gap-3 mt-2">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Tooltip: Narzut</label>
                                            <input type="text" value={v.tooltip_markup_percentage} onChange={(e) => updateVariant(index, 'tooltip_markup_percentage', e.target.value)} className={inputClass} placeholder="Opis narzutu..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Tooltip: Margines W</label>
                                            <input type="text" value={v.tooltip_margin_w_cm} onChange={(e) => updateVariant(index, 'tooltip_margin_w_cm', e.target.value)} className={inputClass} placeholder="Opis marginesu W..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Tooltip: Margines H</label>
                                            <input type="text" value={v.tooltip_margin_h_cm} onChange={(e) => updateVariant(index, 'tooltip_margin_h_cm', e.target.value)} className={inputClass} placeholder="Opis marginesu H..." />
                                        </div>
                                    </div>
                                </details>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Anuluj</button>
                        <button type="submit" disabled={saving || !name} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                            {saving ? 'Zapisywanie...' : material ? 'Zapisz zmiany' : 'Utwórz materiał'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ────────── Process Create/Edit Modal ──────────
function ProcessModal({
    process,
    onSave,
    onClose,
}: {
    process: ProcessItem | null
    onSave: (data: any) => void
    onClose: () => void
}) {
    const [name, setName] = useState(process?.name || '')
    const [method, setMethod] = useState(process?.method || 'AREA')
    const [unitPrice, setUnitPrice] = useState(process ? String(Number(process.unit_price)) : '0')
    const [setupFee, setSetupFee] = useState(process ? String(Number(process.setup_fee)) : '0')
    const [internalCost, setInternalCost] = useState(process?.internal_cost ? String(Number(process.internal_cost)) : '')
    const [marginW, setMarginW] = useState(process ? String(Number(process.margin_w_cm)) : '0')
    const [marginH, setMarginH] = useState(process ? String(Number(process.margin_h_cm)) : '0')
    const [unit, setUnit] = useState(process?.unit || 'm2')
    const [isActive, setIsActive] = useState(process?.is_active ?? true)
    // Tooltips
    const [tooltipMethod, setTooltipMethod] = useState(process?.tooltip_method || '')
    const [tooltipUnitPrice, setTooltipUnitPrice] = useState(process?.tooltip_unit_price || '')
    const [tooltipSetupFee, setTooltipSetupFee] = useState(process?.tooltip_setup_fee || '')
    const [tooltipInternalCost, setTooltipInternalCost] = useState(process?.tooltip_internal_cost || '')
    const [tooltipMarginW, setTooltipMarginW] = useState(process?.tooltip_margin_w_cm || '')
    const [tooltipMarginH, setTooltipMarginH] = useState(process?.tooltip_margin_h_cm || '')
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const payload = {
            name,
            method,
            unit_price: parseFloat(unitPrice),
            setup_fee: parseFloat(setupFee),
            internal_cost: internalCost ? parseFloat(internalCost) : null,
            margin_w_cm: parseFloat(marginW),
            margin_h_cm: parseFloat(marginH),
            unit: unit || null,
            is_active: isActive,
            tooltip_method: tooltipMethod || null,
            tooltip_unit_price: tooltipUnitPrice || null,
            tooltip_setup_fee: tooltipSetupFee || null,
            tooltip_internal_cost: tooltipInternalCost || null,
            tooltip_margin_w_cm: tooltipMarginW || null,
            tooltip_margin_h_cm: tooltipMarginH || null,
        }
        await onSave(payload)
        setSaving(false)
    }

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {process ? 'Edytuj proces' : 'Nowy proces'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa *</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="np. Cięcie CNC" />
                        </div>
                        <div>
                            <LabelWithTooltip label="Metoda *" tooltipText={tooltipMethod || undefined}>
                                <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                                    <option value="AREA">AREA (powierzchnia)</option>
                                    <option value="LINEAR">LINEAR (obwód)</option>
                                    <option value="TIME">TIME (czas)</option>
                                    <option value="UNIT">UNIT (sztuki)</option>
                                </select>
                            </LabelWithTooltip>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <LabelWithTooltip label="Cena/jedn. *" tooltipText={tooltipUnitPrice || undefined}>
                            <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} step="0.01" required className={inputClass} />
                        </LabelWithTooltip>
                        <LabelWithTooltip label="Opłata startowa" tooltipText={tooltipSetupFee || undefined}>
                            <input type="number" value={setupFee} onChange={(e) => setSetupFee(e.target.value)} step="0.01" className={inputClass} />
                        </LabelWithTooltip>
                        <LabelWithTooltip label="Koszt wewn." tooltipText={tooltipInternalCost || undefined}>
                            <input type="number" value={internalCost} onChange={(e) => setInternalCost(e.target.value)} step="0.01" className={inputClass} placeholder="Opcjonalnie" />
                        </LabelWithTooltip>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <LabelWithTooltip label="Margines W (cm)" tooltipText={tooltipMarginW || undefined}>
                            <input type="number" value={marginW} onChange={(e) => setMarginW(e.target.value)} step="0.1" className={inputClass} />
                        </LabelWithTooltip>
                        <LabelWithTooltip label="Margines H (cm)" tooltipText={tooltipMarginH || undefined}>
                            <input type="number" value={marginH} onChange={(e) => setMarginH(e.target.value)} step="0.1" className={inputClass} />
                        </LabelWithTooltip>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Jednostka</label>
                            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass}>
                                <option value="m2">m²</option>
                                <option value="mb">mb</option>
                                <option value="szt">szt</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="procIsActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <label htmlFor="procIsActive" className="text-sm font-medium text-gray-700">Aktywny</label>
                    </div>

                    {/* Tooltip fields */}
                    <details className="text-sm">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium">Tooltipy (opisy pól)</summary>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Tooltip: Metoda</label>
                                <input type="text" value={tooltipMethod} onChange={(e) => setTooltipMethod(e.target.value)} className={inputClass} placeholder="Opis metody..." />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Tooltip: Cena/jedn.</label>
                                <input type="text" value={tooltipUnitPrice} onChange={(e) => setTooltipUnitPrice(e.target.value)} className={inputClass} placeholder="Opis ceny..." />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Tooltip: Opłata start.</label>
                                <input type="text" value={tooltipSetupFee} onChange={(e) => setTooltipSetupFee(e.target.value)} className={inputClass} placeholder="Opis opłaty..." />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Tooltip: Koszt wewn.</label>
                                <input type="text" value={tooltipInternalCost} onChange={(e) => setTooltipInternalCost(e.target.value)} className={inputClass} placeholder="Opis kosztu..." />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Tooltip: Margines W</label>
                                <input type="text" value={tooltipMarginW} onChange={(e) => setTooltipMarginW(e.target.value)} className={inputClass} placeholder="Opis marginesu W..." />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Tooltip: Margines H</label>
                                <input type="text" value={tooltipMarginH} onChange={(e) => setTooltipMarginH(e.target.value)} className={inputClass} placeholder="Opis marginesu H..." />
                            </div>
                        </div>
                    </details>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Anuluj</button>
                        <button type="submit" disabled={saving || !name} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                            {saving ? 'Zapisywanie...' : process ? 'Zapisz zmiany' : 'Utwórz proces'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ────────── Material CSV Import Modal ──────────
function MaterialCSVImportModal({
    onClose,
    onSuccess,
}: {
    onClose: () => void
    onSuccess: () => void
}) {
    const [file, setFile] = useState<File | null>(null)
    const [parsedData, setParsedData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0])
            parseCSV(e.target.files[0])
        }
    }

    const parseCSV = (file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setParsedData(results.data)
                setError(null)
            },
            error: (err) => {
                setError('Błąd parsowania pliku: ' + err.message)
            }
        })
    }

    const handleImport = async () => {
        if (parsedData.length === 0) return
        setLoading(true)
        setError(null)

        try {
            // Group rows by Material ID or Name
            const materialsMap = new Map<string, any>()

            for (const row of parsedData) {
                const matId = row['Material ID']?.trim()
                const name = row['Nazwa']?.trim()
                if (!name) continue // Skip invalid

                const groupKey = matId || name
                if (!materialsMap.has(groupKey)) {
                    materialsMap.set(groupKey, {
                        external_id: matId || null,
                        name: name,
                        category: row['Kategoria']?.trim() || null,
                        description: row['Opis']?.trim() || null,
                        variants: []
                    })
                }

                // Add variant
                const costPrice = parseFloat(row['Cena Zakupu']?.replace(',', '.'))
                if (isNaN(costPrice)) continue // Skip if no price

                materialsMap.get(groupKey).variants.push({
                    external_id: row['Variant ID']?.trim() || null,
                    width_cm: row['Szerokość'] ? parseFloat(row['Szerokość'].replace(',', '.')) : null,
                    length_cm: row['Długość'] ? parseFloat(row['Długość'].replace(',', '.')) : null,
                    cost_price_per_unit: costPrice,
                    unit: row['Jednostka']?.trim() || 'm2',
                    markup_percentage: row['Narzut %'] ? parseFloat(row['Narzut %'].replace(',', '.')) : 0,
                    margin_w_cm: row['Margines W'] ? parseFloat(row['Margines W'].replace(',', '.')) : 0,
                    margin_h_cm: row['Margines H'] ? parseFloat(row['Margines H'].replace(',', '.')) : 0,
                    is_active: true
                })
            }

            const payload = Array.from(materialsMap.values())

            const token = localStorage.getItem('access_token')
            await axios.post(`${API_URL}/materials/bulk`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            })

            onSuccess()
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Błąd podczas importu. Sprawdź format danych.')
        } finally {
            setLoading(false)
        }
    }

    const downloadTemplate = () => {
        const headers = ['Material ID', 'Variant ID', 'Nazwa', 'Kategoria', 'Opis', 'Szerokość', 'Długość', 'Cena Zakupu', 'Jednostka', 'Narzut %', 'Margines W', 'Margines H']
        const csv = Papa.unparse({ fields: headers, data: [] })
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.setAttribute('download', 'szablon_materiały.csv')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/50 p-4 sm:p-6 overflow-y-auto">
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl flex flex-col my-auto max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-xl font-semibold text-gray-900">Import Materiałów z CSV</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="mb-6 flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div>
                            <h3 className="font-medium text-blue-900 mb-1">Instrukcja </h3>
                            <p className="text-sm text-blue-700">Wgraj plik CSV. Kolumny &quot;Nazwa&quot;, &quot;Cena Zakupu&quot; i &quot;Jednostka&quot; (np. m2, mb, pcs) są wymagane. &quot;Material ID&quot; i &quot;Variant ID&quot; służą do aktualizacji i grupowań.</p>
                        </div>
                        <button onClick={downloadTemplate} className="shrink-0 px-3 py-1.5 text-sm bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-medium">
                            Pobierz szablon
                        </button>
                    </div>

                    <div className="mb-6 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors relative">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="pointer-events-none">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="mt-2 text-sm font-medium text-gray-900">
                                {file ? file.name : "Kliknij lub przeciągnij plik CSV tutaj"}
                            </p>
                            {!file && <p className="text-xs text-gray-500 mt-1">Maksymalny rozmiar: 10MB</p>}
                        </div>
                    </div>

                    {parsedData.length > 0 && (
                        <div>
                            <h3 className="font-medium text-gray-900 mb-3">Podgląd danych ({parsedData.length} wierszy)</h3>
                            <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {Object.keys(parsedData[0]).slice(0, 6).map((key) => (
                                                <th key={key} className="px-4 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{key}</th>
                                            ))}
                                            {Object.keys(parsedData[0]).length > 6 && <th className="px-4 py-2 text-left font-medium text-gray-500">...</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {parsedData.slice(0, 5).map((row, i) => (
                                            <tr key={i}>
                                                {Object.values(row).slice(0, 6).map((val: any, j) => (
                                                    <td key={j} className="px-4 py-2 text-gray-900 truncate max-w-[150px]">{val}</td>
                                                ))}
                                                {Object.keys(row).length > 6 && <td className="px-4 py-2 text-gray-400">...</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {parsedData.length > 5 && (
                                <p className="text-xs text-gray-500 mt-2 text-center">Pokazano 5 pierwszych wierszy.</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={loading || parsedData.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {loading && (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        Potwierdź import
                    </button>
                </div>
            </div>
        </div>
    )
}
