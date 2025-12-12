import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRipple } from '../hooks/useRipple'

function Home() {
    const navigate = useNavigate()
    const heroRef = useRef(null)
    const rulesButtonRef = useRef(null)
    const [stars, setStars] = useState([])
    const [particles, setParticles] = useState([])

    // Effet ripple sur le bouton
    useRipple(rulesButtonRef)

    // Génération du starfield et particules
    useEffect(() => {
        const generateStars = () => {
            const starArray = []
            for (let i = 0; i < 100; i++) {
                starArray.push({
                    id: i,
                    left: Math.random() * 100,
                    top: Math.random() * 200,
                    size: Math.random() * 2 + 1,
                    delay: Math.random() * 3
                })
            }
            setStars(starArray)
        }

        const generateParticles = () => {
            const particleArray = []
            for (let i = 0; i < 20; i++) {
                particleArray.push({
                    id: i,
                    left: Math.random() * 100,
                    top: Math.random() * 100,
                    size: Math.random() * 6 + 3,
                    delay: Math.random() * 8,
                    duration: Math.random() * 4 + 6,
                    color: i % 3 === 0 ? 'bg-blood-500/30' : i % 3 === 1 ? 'bg-blood-600/20' : 'bg-red-400/25'
                })
            }
            setParticles(particleArray)
        }

        generateStars()
        generateParticles()
    }, [])

    return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden">

            {/* Starfield animé */}
            <div className="starfield-container">
                {stars.map(star => (
                    <div
                        key={star.id}
                        className="star"
                        style={{
                            left: `${star.left}%`,
                            top: `${star.top}%`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            animationDelay: `${star.delay}s`
                        }}
                    />
                ))}
            </div>

            {/* Particules flottantes */}
            <div className="absolute inset-0 pointer-events-none z-10">
                {particles.map(particle => (
                    <div
                        key={particle.id}
                        className={`particle ${particle.color}`}
                        style={{
                            left: `${particle.left}%`,
                            top: `${particle.top}%`,
                            width: `${particle.size}px`,
                            height: `${particle.size}px`,
                            animationDelay: `${particle.delay}s`,
                            animationDuration: `${particle.duration}s`
                        }}
                    />
                ))}
            </div>

            <div className="w-full max-w-6xl relative z-20" ref={heroRef}>

                {/* Logo et titre - PREMIUM VERSION */}
                <div className="text-center mb-12">
                    {/* Logo 3D avec effet holographique */}
                    <div className="hero-logo text-9xl md:text-[12rem] mb-8 filter drop-shadow-2xl">
                        🐺
                    </div>

                    {/* Titre avec reveal */}
                    <h1 className="hero-title text-6xl md:text-8xl font-black mb-6">
                        <span className="text-blood bg-gradient-to-r from-blood-400 via-blood-600 to-blood-800 bg-clip-text text-transparent drop-shadow-2xl">
                            Loup-Garou
                        </span>
                    </h1>

                    {/* Subtitle avec reveal décalé */}
                    <p className="hero-subtitle text-2xl md:text-3xl text-gray-300 font-bold drop-shadow-xl">
                        Le village a besoin de vous... 🌙
                    </p>
                </div>

                {/* Cartes de mode de jeu - PREMIUM GLASSMORPHISM */}
                <div className="max-w-2xl mx-auto mb-8">

                    {/* Mode En Ligne - SEULE CARTE */}
                    <div
                        onClick={() => navigate('/lobby')}
                        className="relative cursor-pointer group slide-up"
                        style={{ animationDelay: '0.1s' }}
                    >
                        {/* Glow effect background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blood-600/20 to-blood-800/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50 group-hover:opacity-100"></div>

                        {/* Glassmorphism card */}
                        <div className="relative bg-gradient-to-br from-night-800/60 to-night-900/60 backdrop-blur-xl rounded-3xl p-8 md:p-10 border-2 border-blood-600/30 group-hover:border-blood-500/60 shadow-2xl transform group-hover:scale-105 group-hover:-translate-y-2 transition-all duration-500 ripple-container">
                            <div className="text-7xl md:text-8xl mb-6 text-center transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 rotate-in">
                                🌐
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black mb-4 text-center bg-gradient-to-r from-blood-400 via-blood-600 to-blood-800 bg-clip-text text-transparent gradient-animate">
                                Mode Multijoueur
                            </h2>
                            <div className="space-y-3 text-gray-300 text-base md:text-lg">
                                <p className="flex items-center transform group-hover:translate-x-2 transition-transform duration-300">
                                    <span className="text-blood-500 mr-3 text-2xl">🔥</span>
                                    Jouez avec vos amis en ligne
                                </p>
                                <p className="flex items-center transform group-hover:translate-x-2 transition-transform duration-300 delay-75">
                                    <span className="text-blood-500 mr-3 text-2xl">👥</span>
                                    4 à 10 joueurs simultanés
                                </p>
                                <p className="flex items-center transform group-hover:translate-x-2 transition-transform duration-300 delay-150">
                                    <span className="text-blood-500 mr-3 text-2xl">💬</span>
                                    Chat en temps réel
                                </p>
                                <p className="flex items-center transform group-hover:translate-x-2 transition-transform duration-300 delay-225">
                                    <span className="text-blood-500 mr-3 text-2xl">📱</span>
                                    Optimisé mobile & PWA
                                </p>
                            </div>
                            <div className="mt-8 text-center">
                                <span className="inline-block bg-gradient-to-r from-blood-600 to-blood-800 px-8 py-4 rounded-full text-base md:text-lg font-black uppercase tracking-widest shadow-lg shadow-blood-900/50 group-hover:shadow-xl group-hover:shadow-blood-700/50 transition-all duration-300">
                                    🎮 Jouer Maintenant
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info jeu - GLASSMORPHISM */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-blood-600/10 to-blood-800/10 rounded-3xl blur-xl"></div>
                    <div className="relative bg-gradient-to-br from-night-800/50 to-night-900/50 backdrop-blur-xl rounded-3xl p-8 border-2 border-blood-700/20 shadow-2xl text-center">
                        <div className="flex items-center justify-center gap-6 mb-6">
                            <div className="text-5xl">🎮</div>
                            <div className="text-left">
                                <p className="text-blood-400 font-black text-2xl">100% En ligne</p>
                                <p className="text-gray-400 text-base">Aucune installation requise</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-blood-700/20">
                            <div className="transform hover:scale-110 transition-transform duration-300">
                                <div className="text-4xl font-black bg-gradient-to-r from-blood-400 to-blood-600 bg-clip-text text-transparent">4-10</div>
                                <div className="text-sm text-gray-400 font-bold mt-2">Joueurs</div>
                            </div>
                            <div className="transform hover:scale-110 transition-transform duration-300">
                                <div className="text-4xl font-black bg-gradient-to-r from-blood-400 to-blood-600 bg-clip-text text-transparent">8+</div>
                                <div className="text-sm text-gray-400 font-bold mt-2">Rôles</div>
                            </div>
                            <div className="transform hover:scale-110 transition-transform duration-300">
                                <div className="text-4xl font-black bg-gradient-to-r from-blood-400 to-blood-600 bg-clip-text text-transparent">15min</div>
                                <div className="text-sm text-gray-400 font-bold mt-2">Partie</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 space-y-6">
                    <button
                        ref={rulesButtonRef}
                        onClick={() => navigate('/regles')}
                        className="btn-secondary px-8 py-4 text-lg font-bold transform hover:scale-110 transition-all duration-300 ripple-container"
                    >
                        📖 Comment Jouer ?
                    </button>
                    <p className="text-gray-400 text-base font-medium animate-pulse">🌙 Créé avec passion pour les nuits mystérieuses 🐺</p>
                </div>
            </div>
        </div>
    )
}

export default Home
