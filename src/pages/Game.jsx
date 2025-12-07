import { useParams, useNavigate } from 'react-router-dom'

function Game() {
    const { roomCode } = useParams()
    const navigate = useNavigate()

    return (
        <div className="min-h-screen p-4">
            <div className="max-w-6xl mx-auto">

                {/* En-tête */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-blood">
                            🐺 Partie en cours
                        </h1>
                        <p className="text-gray-500 text-sm">Salle: {roomCode}</p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="btn-secondary text-sm"
                    >
                        ❌ Quitter
                    </button>
                </div>

                {/* Zone de jeu principale */}
                <div className="grid lg:grid-cols-3 gap-6">

                    {/* Jeu principal */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Rôle du joueur */}
                        <div className="card-glow text-center">
                            <div className="text-6xl mb-3">🐺</div>
                            <h2 className="text-3xl font-black text-blood mb-2">
                                Loup-Garou
                            </h2>
                            <p className="text-gray-400">
                                Éliminez les villageois sans vous faire démasquer
                            </p>
                        </div>

                        {/* Phase actuelle */}
                        <div className="card bg-gradient-to-r from-night-800 to-blood-900/50 text-center">
                            <h3 className="text-2xl font-bold mb-2">🌙 Phase de Nuit</h3>
                            <p className="text-gray-300">Les loups-garous se réveillent...</p>
                        </div>

                        {/* Grille de joueurs */}
                        <div className="card">
                            <h3 className="text-xl font-bold mb-4">👥 Joueurs vivants</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div
                                        key={i}
                                        className="bg-night-800 hover:bg-blood-900/30 p-4 rounded-xl text-center cursor-pointer border-2 border-transparent hover:border-blood-600 transition-all"
                                    >
                                        <div className="text-3xl mb-2">😊</div>
                                        <p className="font-bold">Joueur {i}</p>
                                        <p className="text-sm text-gray-500">En vie</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Panneau latéral (Chat + Info) */}
                    <div className="space-y-6">

                        {/* Info de la partie */}
                        <div className="card">
                            <h3 className="text-lg font-bold mb-3 text-blood">📊 Statistiques</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Nuit :</span>
                                    <span className="font-bold">1</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Vivants :</span>
                                    <span className="font-bold">5/5</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Loups :</span>
                                    <span className="font-bold text-blood-500">?</span>
                                </div>
                            </div>
                        </div>

                        {/* Chat */}
                        <div className="card h-96 flex flex-col">
                            <h3 className="text-lg font-bold mb-3">💬 Chat</h3>
                            <div className="flex-1 bg-night-900 rounded-lg p-3 mb-3 overflow-y-auto">
                                <p className="text-gray-500 text-sm italic">Aucun message</p>
                            </div>
                            <input
                                type="text"
                                placeholder="Écrivez un message..."
                                className="w-full bg-night-800 border-2 border-night-600 focus:border-blood-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 transition-all"
                            />
                        </div>

                    </div>
                </div>

            </div>
        </div>
    )
}

export default Game
