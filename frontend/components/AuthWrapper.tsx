'use client'

import AuthProvider from '@/components/AuthProvider'

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>
}
