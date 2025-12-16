import { useState } from 'react'

export default function RoleCard({ role, description }) {
    const [isHovered, setIsHovered] = useState(false)

    // Configuration des gradients et couleurs par rôle
    const roleStyles = {
        loup: {
            gradient: 'from-red-900 via-red-800 to-red-950',
            border: 'border-red-500',
            shadow: 'shadow-red-500/50',
            glow: 'shadow-red-500/30',
            rarity: 'legendary',
            watermark: '🐺',
            icon: '🐺'
        },
        voyante: {
            gradient: 'from-purple-900 via-purple-800 to-indigo-950',
            border: 'border-purple-400',
            shadow: 'shadow-purple-400/50',
            glow: 'shadow-purple-400/30',
            rarity: 'epic',
            watermark: '🔮',
            icon: '🔮'
        },
        sorciere: {
            gradient: 'from-green-900 via-emerald-800 to-green-950',
            border: 'border-green-400',
            shadow: 'shadow-green-400/50',
            glow: 'shadow-green-400/30',
            rarity: 'epic',
            watermark: '🧙‍♀️',
            icon: '🧙‍♀️'
        },
        chasseur: {
            gradient: 'from-yellow-900 via-amber-800 to-orange-950',
            border: 'border-yellow-400',
            shadow: 'shadow-yellow-400/50',
            glow: 'shadow-yellow-400/30',
            rarity: 'rare',
            watermark: '🏹',
            icon: '🏹'
        },
        cupidon: {
            gradient: 'from-pink-900 via-pink-800 to-rose-950',
            border: 'border-pink-400',
            shadow: 'shadow-pink-400/50',
            glow: 'shadow-pink-400/30',
            rarity: 'rare',
            watermark: '💘',
            icon: '💘'
        },
        riche: {
            gradient: 'from-yellow-800 via-amber-700 to-yellow-900',
            border: 'border-yellow-300',
            shadow: 'shadow-yellow-300/50',
            glow: 'shadow-yellow-300/30',
            rarity: 'legendary',
            watermark: '💰',
            icon: '💰'
        },
        livreur: {
            gradient: 'from-blue-900 via-cyan-800 to-blue-950',
            border: 'border-blue-400',
            shadow: 'shadow-blue-400/50',
            glow: 'shadow-blue-400/30',
            rarity: 'rare',
            watermark: '🍕',
            icon: '🍕'
        },
        villageois: {
            gradient: 'from-gray-800 via-gray-700 to-gray-900',
            border: 'border-gray-400',
            shadow: 'shadow-gray-400/50',
            glow: 'shadow-gray-400/30',
            rarity: 'common',
            watermark: '👤',
            icon: '👤'
        }
    }

    const style = roleStyles[role] || roleStyles.villageois

    // Bordure selon rareté
    const rarityBorder = {
        legendary: 'border-4 border-yellow-400',
        epic: 'border-4 border-purple-400',
        rare: 'border-4 border-blue-400',
        common: 'border-2 border-gray-400'
    }

    return (
        <div
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Carte principale */}
            <div className={`
                relative
                bg-gradient-to-br ${style.gradient}
                ${rarityBorder[style.rarity]}
                rounded-2xl
                p-6
                overflow-hidden
                transition-all duration-300
                ${isHovered ? `shadow-2xl ${style.shadow} scale-105` : `shadow-xl ${style.glow}`}
            `}>
                {/* Effet shimmer animé */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        style={{
                            animation: 'shimmer 2s infinite',
                            transform: 'skewX(-20deg)'
                        }}
                    />
                </div>

                {/* Watermark en arrière-plan */}
                <div className="absolute right-4 bottom-4 text-9xl opacity-5 select-none pointer-events-none">
                    {style.watermark}
                </div>

                {/* Badge de rareté */}
                <div className="absolute top-3 right-3">
                    <div className={`
                        px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                        ${style.rarity === 'legendary' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black' : ''}
                        ${style.rarity === 'epic' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : ''}
                        ${style.rarity === 'rare' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : ''}
                        ${style.rarity === 'common' ? 'bg-gray-600 text-gray-200' : ''}
                        shadow-lg
                    `}>
                        {style.rarity}
                    </div>
                </div>

                {/* Icône du rôle */}
                <div className="relative z-10 text-center mb-4">
                    <div className={`
                        text-8xl mb-3
                        transition-transform duration-300
                        ${isHovered ? 'scale-110 rotate-3' : 'scale-100'}
                    `}>
                        {style.icon}
                    </div>

                    {/* Nom du rôle */}
                    <h2 className="text-4xl font-black text-white mb-2 drop-shadow-lg uppercase tracking-wider">
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                    </h2>

                    {/* Description */}
                    <p className="text-gray-200 text-sm font-medium px-4 leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Effet de brillance en bas */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>

            {/* Lueur extérieure au hover */}
            {isHovered && (
                <div className={`
                    absolute inset-0 rounded-2xl blur-xl opacity-50 -z-10
                    bg-gradient-to-br ${style.gradient}
                    animate-pulse
                `} />
            )}

            {/* Animation shimmer CSS */}
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%) skewX(-20deg); }
                    100% { transform: translateX(200%) skewX(-20deg); }
                }
            `}</style>
        </div>
    )
}
