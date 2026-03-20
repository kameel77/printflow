'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('App router global error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold text-red-600 mb-4">Wystąpił błąd aplikacji</h2>
      <p className="text-gray-700 mb-6 bg-white p-4 rounded shadow text-left font-mono text-sm max-w-2xl overflow-auto">
        {error.message || 'Nieznany błąd'}
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Spróbuj ponownie
      </button>
    </div>
  )
}
