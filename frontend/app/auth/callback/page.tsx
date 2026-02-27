'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

function CallbackContent() {
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const { login } = useAuth()
    const [isPending, setIsPending] = useState(false)

    useEffect(() => {
        const code = searchParams.get('code')
        const errorParam = searchParams.get('error')

        if (errorParam) {
            setError(`Google zwrócił błąd: ${errorParam}`)
            return
        }

        if (!code) {
            setError('Brak kodu autoryzacji w URL')
            return
        }

        const exchangeCode = async () => {
            try {
                console.log('[Auth] Exchanging code with backend:', `${API_URL}/auth/google`)
                const response = await axios.post(`${API_URL}/auth/google`, { code })
                const { access_token, user } = response.data

                login(access_token, user)
                router.push('/')
            } catch (err: unknown) {
                console.error('[Auth] Login failed:', err)
                if (axios.isAxiosError(err) && err.response?.status === 403) {
                    const detail = err.response.data?.detail
                    if (detail?.code === 'account_pending') {
                        setIsPending(true)
                        return
                    }
                }
                const message =
                    axios.isAxiosError(err) && err.response?.data?.detail
                        ? (typeof err.response.data.detail === 'string'
                            ? err.response.data.detail
                            : err.response.data.detail.message || 'Błąd logowania')
                        : axios.isAxiosError(err) && err.message
                            ? `Błąd połączenia: ${err.message}`
                            : 'Nie udało się zalogować. Spróbuj ponownie.'
                setError(message)
            }
        }

        exchangeCode()
    }, [searchParams, login, router])

    if (isPending) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: '#0f172a',
                fontFamily: 'Inter, sans-serif',
            }}>
                <div style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 20,
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    padding: '48px 40px',
                    maxWidth: 440,
                    width: '100%',
                    textAlign: 'center',
                }}>
                    <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: 'rgba(59, 130, 246, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        fontSize: 28,
                    }}>
                        ⏳
                    </div>
                    <h2 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 600, margin: '0 0 12px' }}>
                        Konto oczekuje na aktywację
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 8px', lineHeight: 1.6 }}>
                        Twoje konto zostało utworzone, ale wymaga aktywacji przez administratora.
                    </p>
                    <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 28px' }}>
                        Skontaktuj się z administratorem systemu w celu uzyskania dostępu.
                    </p>
                    <button
                        onClick={() => router.push('/auth/login')}
                        style={{
                            padding: '12px 24px',
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#93c5fd',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        Wróć do logowania
                    </button>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: '#0f172a',
                fontFamily: 'Inter, sans-serif',
            }}>
                <div style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 20,
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '40px',
                    maxWidth: 420,
                    width: '100%',
                    textAlign: 'center',
                }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        fontSize: 24,
                    }}>
                        ⚠️
                    </div>
                    <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 600, margin: '0 0 12px' }}>
                        Błąd logowania
                    </h2>
                    <p style={{ color: '#ef4444', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
                        {error}
                    </p>
                    <button
                        onClick={() => router.push('/auth/login')}
                        style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Spróbuj ponownie
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#0f172a',
            color: '#94a3b8',
            fontFamily: 'Inter, sans-serif',
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: 40,
                    height: 40,
                    border: '3px solid #1e293b',
                    borderTop: '3px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    margin: '0 auto 16px',
                }} />
                <p>Logowanie...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    )
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: '#0f172a',
                color: '#94a3b8',
            }}>
                <p>Ładowanie...</p>
            </div>
        }>
            <CallbackContent />
        </Suspense>
    )
}
