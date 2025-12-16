/**
 * ⏱️ Timer circulaire avec barre qui se vide
 * - Couleur qui change : bleu → orange → rouge
 * - Pulse quand < 10s
 * - Affichage du temps restant au centre
 */
export default function CircularTimer({ timeRemaining, maxTime = 60 }) {
    // Calculer le pourcentage
    const percentage = (timeRemaining / maxTime) * 100

    // Calculer le strokeDashoffset (cercle de 100 de circonférence)
    const circumference = 2 * Math.PI * 45 // rayon = 45
    const offset = circumference - (percentage / 100) * circumference

    // Couleur selon le temps restant
    const getColor = () => {
        if (timeRemaining <= 5) return '#ef4444' // rouge
        if (timeRemaining <= 10) return '#f97316' // orange
        if (timeRemaining <= 20) return '#fbbf24' // jaune
        return '#3b82f6' // bleu
    }

    // Animation pulse si critique
    const shouldPulse = timeRemaining <= 10

    return (
        <div className={`relative inline-flex items-center justify-center ${
            shouldPulse ? 'animate-pulse' : ''
        }`}>
            {/* SVG Cercle */}
            <svg width="120" height="120" className="transform -rotate-90">
                {/* Cercle de fond */}
                <circle
                    cx="60"
                    cy="60"
                    r="45"
                    stroke="#1f2937"
                    strokeWidth="8"
                    fill="none"
                />
                {/* Cercle de progression */}
                <circle
                    cx="60"
                    cy="60"
                    r="45"
                    stroke={getColor()}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear"
                    style={{
                        filter: shouldPulse ? 'drop-shadow(0 0 8px currentColor)' : 'none'
                    }}
                />
            </svg>

            {/* Temps au centre */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-black transition-colors duration-300 ${
                    timeRemaining <= 5 ? 'text-red-500' :
                    timeRemaining <= 10 ? 'text-orange-500' :
                    'text-blue-400'
                }`}>
                    {timeRemaining}
                </span>
                <span className="text-xs text-gray-400 font-bold">secondes</span>
            </div>
        </div>
    )
}
