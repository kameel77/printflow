'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'

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
    tooltip_method: string | null
    tooltip_unit_price: string | null
    tooltip_setup_fee: string | null
    tooltip_internal_cost: string | null
    tooltip_margin_w_cm: string | null
    tooltip_margin_h_cm: string | null
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
    tooltip_margin_w_cm: string | null
    tooltip_margin_h_cm: string | null
    tooltip_overlap_cm: string | null
    components: TemplateComponent[]
}

// ────────── Tab types ──────────
type TabId = 'templates' | 'materials' | 'processes'

// ────────── Main Component ──────────
export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<TabId>('templates')
    const [templates, setTemplates] = useState<Template[]>([])
    const [materials, setMaterials] = useState<Material[]>([])
    const [processes, setProcesses] = useState<ProcessItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

    // Material modal state
    const [showMaterialModal, setShowMaterialModal] = useState(false)
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

    // Process modal state
    const [showProcessModal, setShowProcessModal] = useState(false)
    const [editingProcess, setEditingProcess] = useState<ProcessItem | null>(null)

    const fetchAll = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [tRes, mRes, pRes] = await Promise.all([
                axios.get(`${API_URL}/templates`),
                axios.get(`${API_URL}/materials`),
                axios.get(`${API_URL}/processes`),
            ])
            setTemplates(tRes.data)
            setMaterials(mRes.data)
            setProcesses(pRes.data)
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

    // Template modal handlers
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

    // Material modal handlers
    const openCreateMaterial = () => {
        setEditingMaterial(null)
        setShowMaterialModal(true)
    }

    const openEditMaterial = (material: Material) => {
        setEditingMaterial(material)
        setShowMaterialModal(true)
    }

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

    // Process modal handlers
    const openCreateProcess = () => {
        setEditingProcess(null)
        setShowProcessModal(true)
    }

    const openEditProcess = (process: ProcessItem) => {
        setEditingProcess(process)
        setShowProcessModal(true)
    }

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

    const tabs: { id: TabId; label: string; count: number }[] = [
        { id: 'templates', label: 'Szablony', count: templates.length },
        { id: 'materials', label: 'Materiały', count: materials.length },
        { id: 'processes', label: 'Procesy', count: processes.length },
    ]

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
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Kalkulator
                        </Link>
                            </div>
                        </div>
                    </div>

                    {/* Tooltips */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Tooltips</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tooltip metoda</label>
                                <input
                                    type="text"
                                    value={tooltipMethod}
                                    onChange={(e) => setTooltipMethod(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Tekst pomocy (opcjonalnie)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tooltip cena/jedn.</label>
                                <input
                                    type="text"
                                    value={tooltipUnitPrice}
                                    onChange={(e) => setTooltipUnitPrice(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Tekst pomocy (opcjonalnie)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tooltip opłata startowa</label>
                                <input
                                    type="text"
                                    value={tooltipSetupFee}
                                    onChange={(e) => setTooltipSetupFee(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Tekst pomocy (opcjonalnie)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tooltip koszt wewn.</label>
                                <input
                                    type="text"
                                    value={tooltipInternalCost}
                                    onChange={(e) => setTooltipInternalCost(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Tekst pomocy (opcjonalnie)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tooltip margines W</label>
                                <input
                                    type="text"
                                    value={tooltipMarginW}
                                    onChange={(e) => setTooltipMarginW(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Tekst pomocy (opcjonalnie)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tooltip margines H</label>
                                <input
                                    type="text"
                                    value={tooltipMarginH}
                                    onChange={(e) => setTooltipMarginH(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Tekst pomocy (opcjonalnie)"
                                />
                            </div>
                        </div>
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
    const [variants, setVariants] = useState<
        {
            width_cm: string
            length_cm: string
            cost_price_per_unit: string
            markup_percentage: string
            unit: string
            margin_w_cm: string
            margin_h_cm: string
            is_active: boolean
        }[]
    >(
        material?.variants.map((v) => ({
            width_cm: v.width_cm != null ? String(v.width_cm) : '',
            length_cm: v.length_cm != null ? String(v.length_cm) : '',
            cost_price_per_unit: String(Number(v.cost_price_per_unit)),
            markup_percentage: String(Number(v.markup_percentage)),
            unit: v.unit,
            margin_w_cm: String(Number(v.margin_w_cm)),
            margin_h_cm: String(Number(v.margin_h_cm)),
            is_active: v.is_active,
        })) || []
    )
    const [saving, setSaving] = useState(false)

    const addVariant = () => {
        setVariants((prev) => [
            ...prev,
            {
                width_cm: '',
                length_cm: '',
                cost_price_per_unit: '0',
                markup_percentage: '0',
                unit: 'm2',
                margin_w_cm: '0',
                margin_h_cm: '0',
                is_active: true,
            },
        ])
    }

    const removeVariant = (index: number) => {
        setVariants((prev) => prev.filter((_, i) => i !== index))
    }

    const updateVariant = (index: number, field: string, value: any) => {
        setVariants((prev) =>
            prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const payload: any = {
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
            })),
        }

        await onSave(payload)
        setSaving(false)
    }

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
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="np. Papier Lateksowy"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kategoria</label>
                                <input
                                    type="text"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="np. Papier, Folia"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Opcjonalny opis"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Variants */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                                Warianty ({variants.length})
                            </h3>
                            <button
                                type="button"
                                onClick={addVariant}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Dodaj wariant
                            </button>
                        </div>

                        {variants.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">
                                Brak wariantów. Dodaj przynajmniej jeden wariant materiału.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {variants.map((v, index) => (
                                    <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-500 uppercase">
                                                Wariant {index + 1}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center gap-1.5 text-sm text-gray-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={v.is_active}
                                                        onChange={(e) => updateVariant(index, 'is_active', e.target.checked)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    Aktywny
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => removeVariant(index)}
                                                    className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Szer. (cm)</label>
                                                <input
                                                    type="number"
                                                    value={v.width_cm}
                                                    onChange={(e) => updateVariant(index, 'width_cm', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    step="0.01"
                                                    placeholder="—"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Cena/jedn. *</label>
                                                <input
                                                    type="number"
                                                    value={v.cost_price_per_unit}
                                                    onChange={(e) => updateVariant(index, 'cost_price_per_unit', e.target.value)}
                                                    required
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Narzut %</label>
                                                <input
                                                    type="number"
                                                    value={v.markup_percentage}
                                                    onChange={(e) => updateVariant(index, 'markup_percentage', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Jednostka *</label>
                                                <select
                                                    value={v.unit}
                                                    onChange={(e) => updateVariant(index, 'unit', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="m2">m²</option>
                                                    <option value="mb">mb</option>
                                                    <option value="pcs">szt</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Dł. (cm)</label>
                                                <input
                                                    type="number"
                                                    value={v.length_cm}
                                                    onChange={(e) => updateVariant(index, 'length_cm', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    step="0.01"
                                                    placeholder="—"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Margines W (cm)</label>
                                                <input
                                                    type="number"
                                                    value={v.margin_w_cm}
                                                    onChange={(e) => updateVariant(index, 'margin_w_cm', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    step="0.1"
                                                    min="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Margines H (cm)</label>
                                                <input
                                                    type="number"
                                                    value={v.margin_h_cm}
                                                    onChange={(e) => updateVariant(index, 'margin_h_cm', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    step="0.1"
                                                    min="0"
                                                />
                                            </div>
                                        </div>
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
    const [internalCost, setInternalCost] = useState(
        process?.internal_cost != null ? String(Number(process.internal_cost)) : ''
    )
    const [marginW, setMarginW] = useState(process ? String(Number(process.margin_w_cm)) : '0')
    const [marginH, setMarginH] = useState(process ? String(Number(process.margin_h_cm)) : '0')
    const [unit, setUnit] = useState(process?.unit || 'm2')
    const [isActive, setIsActive] = useState(process?.is_active ?? true)
    const [saving, setSaving] = useState(false)
    
    // Tooltips
    const [tooltipMethod, setTooltipMethod] = useState(process?.tooltip_method || '')
    const [tooltipUnitPrice, setTooltipUnitPrice] = useState(process?.tooltip_unit_price || '')
    const [tooltipSetupFee, setTooltipSetupFee] = useState(process?.tooltip_setup_fee || '')
    const [tooltipInternalCost, setTooltipInternalCost] = useState(process?.tooltip_internal_cost || '')
    const [tooltipMarginW, setTooltipMarginW] = useState(process?.tooltip_margin_w_cm || '')
    const [tooltipMarginH, setTooltipMarginH] = useState(process?.tooltip_margin_h_cm || '')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const payload: any = {
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
                                placeholder="np. Cięcie CNC"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Metoda kalkulacji *</label>
                                <select
                                    value={method}
                                    onChange={(e) => setMethod(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="AREA">AREA (powierzchnia m²)</option>
                                    <option value="LINEAR">LINEAR (metry bieżące)</option>
                                    <option value="TIME">TIME (czas)</option>
                                    <option value="UNIT">UNIT (za sztukę)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Jednostka</label>
                                <select
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="m2">m²</option>
                                    <option value="mb">mb</option>
                                    <option value="pcs">szt</option>
                                    <option value="h">godz</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Cennik</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cena/jedn. (zł) *</label>
                                <input
                                    type="number"
                                    value={unitPrice}
                                    onChange={(e) => setUnitPrice(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Opłata startowa (zł)</label>
                                <input
                                    type="number"
                                    value={setupFee}
                                    onChange={(e) => setSetupFee(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Koszt wewnętrzny (zł)</label>
                                <input
                                    type="number"
                                    value={internalCost}
                                    onChange={(e) => setInternalCost(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    step="0.01"
                                    min="0"
                                    placeholder="Opcjonalny"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Margins */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Marginesy techniczne</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Margines W (cm)</label>
                                <input
                                    type="number"
                                    value={marginW}
                                    onChange={(e) => setMarginW(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    step="0.1"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Margines H (cm)</label>
                                <input
                                    type="number"
                                    value={marginH}
                                    onChange={(e) => setMarginH(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    step="0.1"
                                    min="0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="processIsActive"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="processIsActive" className="text-sm font-medium text-gray-700">
                            Aktywny
                        </label>
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
                            {saving ? 'Zapisywanie...' : process ? 'Zapisz zmiany' : 'Utwórz proces'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
