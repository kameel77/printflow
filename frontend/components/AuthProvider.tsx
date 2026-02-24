'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

interface User {
    id: number
    email: string
    full_name: string | null
    role: string
    is_active: boolean
}

interface AuthContextType {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (accessToken: string, userData: User) => void
    logout: () => void
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    login: () => { },
    logout: () => { },
})

export const useAuth = () => useContext(AuthContext)

// Paths that don't require authentication
const PUBLIC_PATHS = ['/auth/login', '/auth/callback']

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()

    const logout = useCallback(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        setUser(null)
        router.push('/auth/login')
    }, [router])

    const login = useCallback((accessToken: string, userData: User) => {
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
    }, [])

    // On mount — check for existing token
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('access_token')
            if (!token) {
                setIsLoading(false)
                return
            }

            try {
                const response = await axios.get(`${API_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                setUser(response.data)
            } catch {
                // Token expired or invalid
                localStorage.removeItem('access_token')
                localStorage.removeItem('user')
            } finally {
                setIsLoading(false)
            }
        }

        checkAuth()
    }, [])

    // Redirect unauthenticated users (after loading finishes)
    useEffect(() => {
        if (isLoading) return
        const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

        if (!user && !isPublicPath) {
            router.push('/auth/login')
        }
    }, [user, isLoading, pathname, router])

    // Show nothing while checking auth on protected pages
    const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
    if (isLoading && !isPublicPath) {
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
                    <p>Ładowanie...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        )
    }

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}
