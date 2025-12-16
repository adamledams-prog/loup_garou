import { useEffect, useState } from 'react'
import { audioManager } from '../utils/audioManager'
import { vibrate } from '../utils/mobile'

/**
 * 💀 Animation de mort spectaculaire
 * - Avatar qui disparaît avec particules
 * - Son dramatique
 * - Révélation du rôle avec flip card
 * - Épitaphe personnalisée
 */
export default function DeathAnimation({ player, cause, onComplete }) {
    const [step, setStep] = useState('appear') // appear → dying → roleReveal → epitaph → fadeOut

    // Générer les particules une seule fois (pas dans useEffect)
    const [particles] = useState(() =>
        Array.from({ length: 40 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 20 + 10,
            delay: Math.random() * 0.5,
            duration: Math.random() * 1 + 1
        }))
    )

    useEffect(() => {
        // 🔊 Son de mort dramatique
        audioManager.beep(110, 0.8, 0.6)
        vibrate.death()

        // Séquence d'animations
        const timeline = [
            { delay: 500, action: () => setStep('dying') },
            { delay: 2000, action: () => setStep('roleReveal') },
            { delay: 4500, action: () => setStep('epitaph') },
            { delay: 7000, action: () => setStep('fadeOut') },
            { delay: 8000, action: () => onComplete() }
        ]

        const timeouts = timeline.map(({ delay, action }) => setTimeout(action, delay))

        return () => timeouts.forEach(clearTimeout)
    }, [player, onComplete])

    const getCauseIcon = (cause) => {
        switch (cause) {
            case 'wolf': return '🐺'
            case 'vote': return '⚖️'
            case 'poison': return '☠️'
            case 'hunter': return '🎯'
            case 'lovers': return '💔'
            default: return '💀'
        }
    }

    const getCauseText = (cause) => {
        switch (cause) {
            case 'wolf': return 'dévoré par les loups'
            case 'vote': return 'éliminé par le village'
            case 'poison': return 'empoisonné par la sorcière'
            case 'hunter': return 'abattu par le chasseur'
            case 'lovers': return 'mort de chagrin'
            default: return 'est mort'
        }
    }

    const getRoleIcon = (role) => {
        switch (role) {
            case 'loup': return '🐺'
            case 'voyante': return '🔮'
            case 'sorciere': return '🧪'
            case 'chasseur': return '🎯'
            case 'cupidon': return '💘'
            case 'riche': return '💰'
            case 'livreur': return '🍕'
            case 'villageois': return '👨‍🌾'
            default: return '❓'
        }
    }

    const getRoleName = (role) => {
        switch (role) {
            case 'loup': return 'Loup-Garou'
            case 'voyante': return 'Voyante'
            case 'sorciere': return 'Sorcière'
            case 'chasseur': return 'Chasseur'
            case 'cupidon': return 'Cupidon'
            case 'riche': return 'Riche'
            case 'livreur': return 'Livreur'
            case 'villageois': return 'Villageois'
            default: return 'Inconnu'
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fadeIn">
            {/* Particules de fumée/sang */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {particles.map(particle => (
                    <div
                        key={particle.id}
                        className="absolute rounded-full bg-red-600/30 blur-xl animate-float"
                        style={{
                            left: `${particle.x}%`,
                            top: `${particle.y}%`,
                            width: `${particle.size}px`,
                            height: `${particle.size}px`,
                            animationDelay: `${particle.delay}s`,
                            animationDuration: `${particle.duration}s`
                        }}
                    />
                ))}
            </div>

            {/* Contenu principal */}
            <div className="relative z-10 text-center space-y-8">

                {/* Étape 1 & 2 : Avatar qui disparaît */}
                {(step === 'appear' || step === 'dying') && (
                    <div className={`transition-all duration-1000 ${
                        step === 'dying' ? 'opacity-0 scale-0 blur-xl rotate-180' : 'opacity-100 scale-100'
                    }`}>
                        <div className="text-9xl mb-4 animate-pulse">
                            {player.avatar}
                        </div>
                        <p className="text-4xl font-bold text-red-500 animate-pulse">
                            {player.name}
                        </p>
                    </div>
                )}

                {/* Étape 3 : Révélation du rôle (flip card) */}
                {step === 'roleReveal' && (
                    <div className="animate-slideUp">
                        <div className="bg-gradient-to-br from-blood-900 to-night-900 rounded-2xl p-8 border-4 border-blood-600 shadow-2xl transform hover:scale-105 transition-transform">
                            <div className="text-8xl mb-4 animate-bounce-in">
                                {getRoleIcon(player.role)}
                            </div>
                            <p className="text-3xl font-bold text-blood-400 mb-2">
                                {player.name}
                            </p>
                            <p className="text-5xl font-black text-white">
                                {getRoleName(player.role)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Étape 4 : Épitaphe */}
                {step === 'epitaph' && (
                    <div className="animate-fadeIn space-y-6">
                        <div className="text-6xl mb-4">
                            {getCauseIcon(cause)}
                        </div>
                        <div className="bg-night-900/80 rounded-xl p-6 border-2 border-gray-700 max-w-2xl mx-auto">
                            <p className="text-2xl text-gray-300 italic mb-4">
                                « {player.name} »
                            </p>
                            <p className="text-xl text-blood-400 font-bold">
                                {getCauseText(cause)}
                            </p>
                            <div className="mt-6 pt-6 border-t border-gray-700">
                                <p className="text-gray-500 text-sm">
                                    Repose en paix {getRoleIcon(player.role)} {getRoleName(player.role)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Étape 5 : Fade out */}
                {step === 'fadeOut' && (
                    <div className="animate-fadeOut opacity-0">
                        <p className="text-gray-600">Adieu...</p>
                    </div>
                )}
            </div>
        </div>
    )
}
