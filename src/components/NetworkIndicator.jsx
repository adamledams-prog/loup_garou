import { useState, useEffect } from 'react'
import { getNetworkQuality } from '../utils/mobile'

/**
 * 📡 Indicateur de qualité réseau
 * Affiche la qualité de connexion avec code couleur
 */
export default function NetworkIndicator({ position = 'top-right' }) {
    const [networkInfo, setNetworkInfo] = useState(null)

    useEffect(() => {
        const updateNetwork = () => {
            const info = getNetworkQuality()
            setNetworkInfo(info)
        }

        // Mettre à jour immédiatement
        updateNetwork()

        // Écouter les changements
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
        if (connection) {
            connection.addEventListener('change', updateNetwork)
            return () => connection.removeEventListener('change', updateNetwork)
        }
    }, [])

    if (!networkInfo) return null

    const positionClasses = {
        'top-right': 'top-4 right-4',
        'top-left': 'top-4 left-4',
        'bottom-right': 'bottom-4 right-4',
        'bottom-left': 'bottom-4 left-4'
    }

    return (
        <div className={`fixed ${positionClasses[position]} z-50 animate-fadeIn`}>
            <div className={`
                glass-card p-3 flex items-center gap-2
                border-2 transition-all duration-300 shadow-lg
                ${networkInfo.color === 'green' ? 'border-green-500/50 bg-green-900/20' : ''}
                ${networkInfo.color === 'yellow' ? 'border-yellow-500/50 bg-yellow-900/20' : ''}
                ${networkInfo.color === 'orange' ? 'border-orange-500/50 bg-orange-900/20' : ''}
                ${networkInfo.color === 'red' ? 'border-red-500/50 bg-red-900/20 animate-pulse' : ''}
            `}>
                <span className="text-2xl">{networkInfo.icon}</span>
                <div className="text-xs">
                    <div className={`font-bold ${
                        networkInfo.color === 'green' ? 'text-green-400' : ''
                    }${
                        networkInfo.color === 'yellow' ? 'text-yellow-400' : ''
                    }${
                        networkInfo.color === 'orange' ? 'text-orange-400' : ''
                    }${
                        networkInfo.color === 'red' ? 'text-red-400' : ''
                    }`}>
                        {networkInfo.effectiveType?.toUpperCase() || 'NET'}
                    </div>
                    {networkInfo.downlink && (
                        <div className="text-gray-400 text-[10px]">{networkInfo.downlink}</div>
                    )}
                </div>
            </div>
        </div>
    )
}
