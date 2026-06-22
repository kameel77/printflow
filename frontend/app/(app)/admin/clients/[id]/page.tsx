"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/components/AuthProvider";
import Header from "@/components/Header";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

interface ClientFull {
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
  created_at: string;
}

interface OfferListItem {
  id: number;
  token: string;
  status: string;
  title: string | null;
  view_count: number;
  total_value_net: number | null;
  variant_count: number;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Szkic", color: "bg-gray-100 text-gray-700" },
  SENT: { label: "Wysłana", color: "bg-blue-100 text-blue-700" },
  VIEWED: { label: "Wyświetlona", color: "bg-yellow-100 text-yellow-700" },
  ACCEPTED: { label: "Zaakceptowana", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Odrzucona", color: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Wygasła", color: "bg-gray-200 text-gray-500" },
};

export default function ClientDetailPage() {
  const params = useParams();
  const { user, logout } = useAuth();
  const [client, setClient] = useState<ClientFull | null>(null);
  const [offers, setOffers] = useState<OfferListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [editingData, setEditingData] = useState<Partial<ClientFull>>({});

  const clientId = params?.id as string;

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientRes, offersRes] = await Promise.all([
        axios.get(`${API_URL}/clients/${clientId}`, {
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_URL}/offers`, {
          headers: getAuthHeaders(),
          params: { client_id: clientId },
        }),
      ]);
      setClient(clientRes.data);
      setOffers(offersRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Błąd ładowania danych klienta");
    } finally {
      setLoading(false);
    }
  }, [clientId, getAuthHeaders]);

  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId, fetchData]);

  const handleEditClick = () => {
    if (client) {
      setEditingData({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        company_name: client.company_name || "",
        company_nip: client.company_nip || "",
        company_address: client.company_address || "",
        company_street: client.company_street || "",
        company_postal_code: client.company_postal_code || "",
        company_city: client.company_city || "",
        notes: client.notes || "",
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    setSavingClient(true);
    try {
      await axios.patch(`${API_URL}/clients/${clientId}`, editingData, {
        headers: getAuthHeaders(),
      });
      setIsEditing(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Błąd zapisu danych klienta");
    } finally {
      setSavingClient(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        title="Karta klienta"
        subtitle={loading ? "Wczytywanie..." : client?.name}
        backHref="/admin/clients"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          client && (
            <div className="space-y-6">
              {/* Client Details Card */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    Dane klienta
                  </h2>
                  {!isEditing && (
                    <button
                      onClick={handleEditClick}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edytuj dane
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4 max-w-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Imię i nazwisko
                        </label>
                        <input
                          type="text"
                          value={editingData.name || ""}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              name: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={editingData.email || ""}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              email: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefon
                        </label>
                        <input
                          type="text"
                          value={editingData.phone || ""}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              phone: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Firma
                        </label>
                        <input
                          type="text"
                          value={editingData.company_name || ""}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              company_name: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          NIP
                        </label>
                        <input
                          type="text"
                          value={editingData.company_nip || ""}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              company_nip: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ulica i numer
                        </label>
                        <input
                          type="text"
                          value={editingData.company_street || ""}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              company_street: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kod pocztowy
                        </label>
                        <input
                          type="text"
                          value={editingData.company_postal_code || ""}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              company_postal_code: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Miejscowość
                        </label>
                        <input
                          type="text"
                          value={editingData.company_city || ""}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              company_city: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notatki
                        </label>
                        <textarea
                          rows={3}
                          value={editingData.notes || ""}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              notes: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                      <button
                        onClick={handleSave}
                        disabled={savingClient}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        {savingClient ? "Zapisywanie..." : "Zapisz zmiany"}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div>
                          <span className="block text-sm font-medium text-gray-500 mb-1">
                            Imię i nazwisko
                          </span>
                          <span className="block text-gray-900">
                            {client.name}
                          </span>
                        </div>
                        <div>
                          <span className="block text-sm font-medium text-gray-500 mb-1">
                            Firma
                          </span>
                          <span className="block text-gray-900">
                            {client.company_name || "—"}{" "}
                            {client.company_nip
                              ? `(NIP: ${client.company_nip})`
                              : ""}
                          </span>
                        </div>
                        <div>
                          <span className="block text-sm font-medium text-gray-500 mb-1">
                            Adres firmy
                          </span>
                          {client.company_street ||
                          client.company_city ||
                          client.company_address ? (
                            <span className="block text-gray-900 whitespace-pre-wrap">
                              {client.company_street && (
                                <>
                                  {client.company_street}
                                  <br />
                                </>
                              )}
                              {(client.company_postal_code ||
                                client.company_city) && (
                                <>
                                  {client.company_postal_code}{" "}
                                  {client.company_city}
                                  <br />
                                </>
                              )}
                              {client.company_address &&
                                !client.company_street &&
                                !client.company_city && (
                                  <>{client.company_address}</>
                                )}
                            </span>
                          ) : (
                            <span className="block text-gray-900">—</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <span className="block text-sm font-medium text-gray-500 mb-1">
                            E-mail
                          </span>
                          <span className="block text-gray-900">
                            {client.email || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-sm font-medium text-gray-500 mb-1">
                            Telefon
                          </span>
                          <span className="block text-gray-900">
                            {client.phone || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-sm font-medium text-gray-500 mb-1">
                            Data dodania
                          </span>
                          <span className="block text-gray-900">
                            {formatDate(client.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {client.notes && (
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <span className="block text-sm font-medium text-gray-500 mb-2">
                          Notatki
                        </span>
                        <span className="block text-sm text-gray-700 whitespace-pre-wrap">
                          {client.notes}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Offers List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    Oferty klienta
                  </h2>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {offers.length}
                  </span>
                </div>

                {offers.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                    <p className="text-gray-500">
                      Ten klient nie ma jeszcze przypisanych żadnych ofert.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left font-medium text-gray-500">
                            Oferta
                          </th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500">
                            Wartość netto
                          </th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500">
                            Otwarto
                          </th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500">
                            Data
                          </th>
                          <th className="px-6 py-3 text-right font-medium text-gray-500">
                            Akcje
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {offers.map((offer) => {
                          const statusCfg = STATUS_CONFIG[offer.status] || {
                            label: offer.status,
                            color: "bg-gray-100 text-gray-700",
                          };
                          return (
                            <tr
                              key={offer.id}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    #{String(offer.id).padStart(3, "0")}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">
                                    {offer.title || "—"}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {offer.total_value_net ? (
                                  <span className="font-semibold text-gray-900">
                                    {formatCurrency(offer.total_value_net)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                                {offer.variant_count > 1 && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {offer.variant_count} warianty
                                  </p>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}
                                >
                                  {statusCfg.label}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {offer.view_count > 0 ? (
                                  <span className="text-xs text-gray-600">
                                    {offer.view_count}×
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    Nie otwarto
                                  </span>
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
