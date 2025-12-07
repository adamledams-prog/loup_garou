import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Home() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">

                {/* Logo et titre */}
                <div className="text-center mb-12 animate-float">
                    <div className="text-8xl md:text-9xl mb-6 filter drop-shadow-2xl animate-glow">
                        🐺
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black mb-4">
                        <span className="text-blood bg-gradient-to-r from-blood-400 via-blood-600 to-blood-800 bg-clip-text text-transparent drop-shadow-lg">
                            Loup-Garou
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 font-medium">
                        Le village a besoin de vous... 🌙
                    </p>
                </div>

                {/* Cartes de mode de jeu */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">

                    {/* Mode En Ligne */}
                    <div
                        onClick={() => navigate('/lobby')}
                        className="card-glow cursor-pointer group transform hover:scale-105 transition-all duration-300"
                    >
                        <div className="text-6xl mb-4 text-center group-hover:animate-bounce">
                            🌐
                        </div>
                        <h2 className="text-3xl font-bold mb-3 text-center text-blood">
                            Mode En Ligne
                        </h2>
                        <div className="space-y-2 text-gray-300">
                            <p className="flex items-center">
                                <span className="text-blood-500 mr-2">🔥</span>
                                Jouez avec vos amis en ligne
                            </p>
                            <p className="flex items-center">
                                <span className="text-blood-500 mr-2">👥</span>
                                4 à 10 joueurs
                            </p>
                            <p className="flex items-center">
                                <span className="text-blood-500 mr-2">💬</span>
                                Chat en temps réel
                            </p>
                            <p className="flex items-center">
                                <span className="text-blood-500 mr-2">⚡</span>
                                Actions simultanées
                            </p>
                        </div>
                        <div className="mt-6">
                            <span className="inline-block bg-gradient-to-r from-blood-600 to-blood-800 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider">
                                Recommandé
                            </span>
                        </div>
                    </div>

                    {/* Mode Local */}
                    <div
                        className="card cursor-pointer group transform hover:scale-105 transition-all duration-300 opacity-75 hover:opacity-100"
                    >
                        <div className="text-6xl mb-4 text-center group-hover:animate-bounce">
                            📱
                        </div>
                        <h2 className="text-3xl font-bold mb-3 text-center text-gray-300">
                            Mode Local
                        </h2>
                        <div className="space-y-2 text-gray-400">
                            <p className="flex items-center">
                                <span className="text-gray-500 mr-2">📲</span>
                                Un seul appareil
                            </p>
                            <p className="flex items-center">
                                <span className="text-gray-500 mr-2">👤</span>
                                5 joueurs fixes
                            </p>
                            <p className="flex items-center">
                                <span className="text-gray-500 mr-2">🔄</span>
                                Tour par tour
                            </p>
                            <p className="flex items-center">
                                <span className="text-gray-500 mr-2">📡</span>
                                Pas de connexion requise
                            </p>
                        </div>
                        <div className="mt-6">
                            <span className="inline-block bg-gradient-to-r from-gray-600 to-gray-800 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider">
                                Bientôt
                            </span>
                        </div>
                    </div>
                </div>

                {/* Info serveur */}
                <div className="card text-center">
                    <p className="text-gray-300 mb-3">
                        💡 <span className="font-bold">Astuce :</span> Le serveur doit être démarré pour jouer en ligne
                    </p>
                    <code className="bg-night-900 text-blood-400 px-4 py-2 rounded-lg inline-block font-mono text-sm md:text-base">
                        npm run server
                    </code>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-gray-500 text-sm">
                    <p>🌙 Créé avec passion pour les nuits mystérieuses 🐺</p>
                </div>
            </div>
        </div>
    )
}

export default Home
