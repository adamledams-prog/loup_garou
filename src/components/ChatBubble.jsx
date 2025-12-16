import { useEffect, useRef } from 'react'

export default function ChatBubble({ message, isMyMessage, playerAvatar, playerName, playerRole, timestamp }) {
    const bubbleRef = useRef(null)

    // Auto-scroll smooth vers le bas
    useEffect(() => {
        if (bubbleRef.current) {
            bubbleRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }
    }, [])

    // Couleurs subtiles selon le rôle
    const roleColors = {
        loup: 'bg-red-900/20 border-red-700/30',
        voyante: 'bg-purple-900/20 border-purple-700/30',
        sorciere: 'bg-green-900/20 border-green-700/30',
        chasseur: 'bg-yellow-900/20 border-yellow-700/30',
        cupidon: 'bg-pink-900/20 border-pink-700/30',
        riche: 'bg-amber-900/20 border-amber-700/30',
        livreur: 'bg-blue-900/20 border-blue-700/30',
        villageois: 'bg-gray-800/20 border-gray-600/30'
    }

    const roleColor = roleColors[playerRole] || roleColors.villageois

    // Format timestamp
    const formatTime = (timestamp) => {
        if (!timestamp) return ''
        const date = new Date(timestamp)
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div
            ref={bubbleRef}
            className={`flex gap-3 ${isMyMessage ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}
        >
            {/* Avatar du joueur */}
            <div className="flex-shrink-0">
                <div className={`
                    w-10 h-10 rounded-full
                    flex items-center justify-center
                    text-xl
                    bg-gradient-to-br from-night-700 to-night-800
                    border-2 border-night-600
                    shadow-lg
                    ${isMyMessage ? 'ring-2 ring-blood-500/50' : ''}
                `}>
                    {playerAvatar || '😊'}
                </div>
            </div>

            {/* Bulle de message */}
            <div className={`
                flex flex-col max-w-[70%]
                ${isMyMessage ? 'items-end' : 'items-start'}
            `}>
                {/* Nom du joueur (sauf si c'est moi) */}
                {!isMyMessage && (
                    <div className="text-xs font-bold text-gray-400 mb-1 px-2">
                        {playerName}
                    </div>
                )}

                {/* Message */}
                <div className={`
                    px-4 py-3 rounded-2xl
                    border
                    ${isMyMessage
                        ? 'bg-gradient-to-br from-blood-900/40 to-blood-800/40 border-blood-600/50 rounded-tr-none'
                        : `${roleColor} rounded-tl-none`
                    }
                    backdrop-blur-sm
                    shadow-lg
                    transition-all duration-200
                    hover:shadow-xl hover:scale-[1.02]
                `}>
                    <p className={`text-sm leading-relaxed ${isMyMessage ? 'text-gray-200' : 'text-gray-300'}`}>
                        {message}
                    </p>
                </div>

                {/* Timestamp */}
                <div className="text-[10px] text-gray-500 mt-1 px-2">
                    {formatTime(timestamp)}
                </div>

                {/* Zone réactions (placeholder pour futures fonctionnalités) */}
                <div className="flex gap-1 mt-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Futurs emojis de réaction */}
                </div>
            </div>
        </div>
    )
}
