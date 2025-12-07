// Configuration de l'environnement
export const config = {
    // URL du serveur Socket.io
    serverUrl: import.meta.env.VITE_SERVER_URL ||
        (import.meta.env.MODE === 'production'
            ? window.location.origin
            : 'http://localhost:3000'),

    // Autres configs
    isDevelopment: import.meta.env.MODE === 'development',
    isProduction: import.meta.env.MODE === 'production',
}

export default config
