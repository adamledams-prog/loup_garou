import { useNavigate } from 'react-router-dom'

function Rules() {
    const navigate = useNavigate()

    const roles = [
        {
            name: 'Loup-Garou',
            emoji: '🐺',
            team: 'Loups',
            color: 'text-red-500',
            description: 'Vous êtes un loup-garou ! La nuit, vous choisissez avec les autres loups un villageois à dévorer.',
            goal: 'Éliminer tous les villageois',
            power: 'Chaque nuit, votez pour éliminer un villageois'
        },
        {
            name: 'Voyante',
            emoji: '🔮',
            team: 'Village',
            color: 'text-purple-500',
            description: 'Vous pouvez voir le rôle d\'un joueur chaque nuit.',
            goal: 'Démasquer les loups et protéger le village',
            power: 'Chaque nuit, consultez le rôle d\'un joueur'
        },
        {
            name: 'Sorcière',
            emoji: '🧪',
            team: 'Village',
            color: 'text-green-500',
            description: 'Vous possédez 2 potions : une de vie et une de mort.',
            goal: 'Utiliser vos potions stratégiquement',
            power: '1 potion de vie (ressuscite la victime), 1 potion de mort (tue quelqu\'un)'
        },
        {
            name: 'Chasseur',
            emoji: '🎯',
            team: 'Village',
            color: 'text-orange-500',
            description: 'Si vous mourez, vous emportez quelqu\'un avec vous !',
            goal: 'Protéger le village et éliminer un loup avant de mourir',
            power: 'En mourant, choisissez un joueur à éliminer'
        },
        {
            name: 'Cupidon',
            emoji: '💘',
            team: 'Village',
            color: 'text-pink-500',
            description: 'La première nuit, créez un couple. Si l\'un meurt, l\'autre meurt de chagrin.',
            goal: 'Former un couple stratégique',
            power: 'Nuit 1 : Choisissez 2 joueurs qui tombent amoureux'
        },
        {
            name: 'Riche',
            emoji: '💰',
            team: 'Village',
            color: 'text-yellow-500',
            description: 'Vous êtes fortuné ! Votre vote compte double.',
            goal: 'Influencer les votes pour protéger le village',
            power: 'Votre vote compte pour 2 voix'
        },
        {
            name: 'Livreur',
            emoji: '📦',
            team: 'Village',
            color: 'text-blue-500',
            description: 'Vous livrez des pizzas et protégez un villageois chaque nuit.',
            goal: 'Protéger les joueurs importants',
            power: 'Chaque nuit, protégez quelqu\'un des loups'
        },
        {
            name: 'Villageois',
            emoji: '👤',
            team: 'Village',
            color: 'text-gray-400',
            description: 'Vous êtes un simple villageois. Pas de pouvoir spécial, mais votre vote compte !',
            goal: 'Identifier les loups et les éliminer par le vote',
            power: 'Aucun pouvoir spécial, participez aux discussions et votes'
        }
    ]

    return (
        <div className="min-h-screen p-4">
            <div className="max-w-4xl mx-auto">
                {/* En-tête */}
                <div className="text-center mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="btn-secondary mb-6 text-sm"
                    >
                        ← Retour au menu
                    </button>
                    <div className="text-6xl mb-4 animate-float">📖</div>
                    <h1 className="text-4xl md:text-5xl font-black mb-2">
                        <span className="text-blood">Règles du Jeu</span>
                    </h1>
                    <p className="text-gray-400">Tout ce qu'il faut savoir pour jouer</p>
                </div>

                {/* But du jeu */}
                <div className="card-glow mb-6">
                    <h2 className="text-2xl font-bold mb-3 text-blood">🎯 But du Jeu</h2>
                    <div className="space-y-2 text-gray-300">
                        <p><strong className="text-white">👥 Villageois :</strong> Identifiez et éliminez tous les loups-garous</p>
                        <p><strong className="text-white">🐺 Loups-Garous :</strong> Éliminez tous les villageois sans vous faire démasquer</p>
                    </div>
                </div>

                {/* Déroulement */}
                <div className="card mb-6">
                    <h2 className="text-2xl font-bold mb-4 text-blood">🌓 Déroulement d'un Tour</h2>
                    <div className="space-y-4">
                        <div className="bg-blue-900/30 p-4 rounded-lg border-l-4 border-blue-600">
                            <h3 className="font-bold text-white mb-2">🌙 1. Phase de Nuit (60s)</h3>
                            <p className="text-gray-300 text-sm">
                                Les rôles spéciaux agissent en secret : loups votent pour tuer, voyante consulte, sorcière décide...
                            </p>
                        </div>

                        <div className="bg-yellow-900/30 p-4 rounded-lg border-l-4 border-yellow-600">
                            <h3 className="font-bold text-white mb-2">☀️ 2. Phase de Jour (30s)</h3>
                            <p className="text-gray-300 text-sm">
                                Le village se réveille. Si quelqu'un est mort, il est révélé. Discussion libre dans le chat !
                            </p>
                        </div>

                        <div className="bg-red-900/30 p-4 rounded-lg border-l-4 border-red-600">
                            <h3 className="font-bold text-white mb-2">⚖️ 3. Phase de Vote (45s)</h3>
                            <p className="text-gray-300 text-sm">
                                Tous les joueurs vivants votent pour éliminer un suspect. Le joueur avec le plus de votes est éliminé.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Les Rôles */}
                <div className="card mb-6">
                    <h2 className="text-2xl font-bold mb-4 text-blood">🎭 Les Rôles</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        {roles.map((role) => (
                            <div key={role.name} className="bg-night-800 p-4 rounded-lg border-2 border-night-700 hover:border-blood-600 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="text-4xl">{role.emoji}</div>
                                    <div>
                                        <h3 className={`font-bold text-lg ${role.color}`}>{role.name}</h3>
                                        <p className="text-xs text-gray-500">{role.team}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-300 mb-2">{role.description}</p>
                                <div className="bg-night-900 p-2 rounded text-xs">
                                    <p className="text-gray-400"><strong className="text-white">Pouvoir :</strong> {role.power}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Conseils */}
                <div className="card-glow">
                    <h2 className="text-2xl font-bold mb-4 text-blood">💡 Conseils pour Débutants</h2>
                    <div className="space-y-2 text-sm text-gray-300">
                        <p>✅ <strong className="text-white">Villageois :</strong> Écoutez les indices, observez les comportements suspects</p>
                        <p>✅ <strong className="text-white">Loups :</strong> Restez discrets, accusez les autres, créez la confusion</p>
                        <p>✅ <strong className="text-white">Voyante :</strong> Ne révélez pas votre rôle trop tôt !</p>
                        <p>✅ <strong className="text-white">Sorcière :</strong> Gardez vos potions pour les moments clés</p>
                        <p>✅ <strong className="text-white">Chat :</strong> Communiquez ! Le bluff fait partie du jeu 😉</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 mb-4">
                    <button
                        onClick={() => navigate('/lobby')}
                        className="btn-primary text-lg px-8 py-4"
                    >
                        🎮 Commencer à Jouer
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Rules
