'use client'

import { useState, useRef, useEffect } from 'react'

interface TooltipProps {
    text: string | null | undefined
    position?: 'top' | 'bottom' | 'left' | 'right'
    children?: React.ReactNode
}

export function Tooltip({ text, position = 'top', children }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false)
    const tooltipRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
                setIsVisible(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (!text) {
        return <>{children}</>
    }

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    }

    return (
        <div className="relative inline-flex" ref={tooltipRef}>
            <div
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                onFocus={() => setIsVisible(true)}
                onBlur={() => setIsVisible(false)}
            >
                {children}
            </div>
            {isVisible && (
                <div
                    className={`absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-pre-wrap max-w-sm ${positionClasses[position]}`}
                    role="tooltip"
                >
                    {text}
                    <div className={`absolute w-2 h-2 bg-gray-900 rotate-45 ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' : position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' : position === 'left' ? 'right-full top-1/2 -translate-y-1/2 -mr-1' : 'left-full top-1/2 -translate-y-1/2 -ml-1'}`} />
                </div>
            )}
        </div>
    )
}

interface LabelWithTooltipProps {
    label: string
    tooltipText: string | null | undefined
    required?: boolean
    children: React.ReactNode
}

export function LabelWithTooltip({ label, tooltipText, required, children }: LabelWithTooltipProps) {
    return (
        <label className="block">
            <span className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                {label}
                {required && <span className="text-red-500">*</span>}
                {tooltipText && (
                    <Tooltip text={tooltipText}>
                        <button
                            type="button"
                            className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help"
                            aria-label={`Info about ${label}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    </Tooltip>
                )}
            </span>
            {children}
        </label>
    )
}
