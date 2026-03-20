import React, { useState } from 'react'

interface SendOfferModalProps {
    isOpen: boolean
    onClose: () => void
    onSend: (message: string) => Promise<void>
    clientName?: string
}

export default function SendOfferModal({ isOpen, onClose, onSend, clientName }: SendOfferModalProps) {
    const [message, setMessage] = useState('')
    const [isSending, setIsSending] = useState(false)

    if (!isOpen) return null

    const handleSend = async () => {
        try {
            setIsSending(true)
            await onSend(message)
            setMessage('')
            onClose()
        } catch (error) {
            console.error('Failed to send offer:', error)
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Wyślij ofertę do {clientName || 'klienta'}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">
                        Oferta zostanie wysłana na adres email klienta. Możesz dodać dodatkową wiadomość, która pojawi się w treści emaila.
                    </p>
                    
                    <div>
                        <label htmlFor="custom-message" className="block text-sm font-medium text-gray-700 mb-1">
                            Dodatkowa wiadomość (opcjonalnie)
                        </label>
                        <textarea
                            id="custom-message"
                            rows={5}
                            className="w-full text-sm border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                            placeholder="Zgodnie z naszą rozmową przesyłam wycenę z uwzględnieniem dodatkowego rabatu..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSending}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isSending}
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    >
                        {isSending ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Wysyłanie...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                Wyślij ofertę
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
