// Configuration de l'environnement
export const config = {
    // URL du serveur Socket.io
    // Pour le développement : localhost:3000
    // Pour la production : vous devrez déployer le serveur séparément
    // Options : Railway.app, Render.com, ou serveur VPS
    serverUrl: import.meta.env.VITE_SERVER_URL || 'http://localhost:3000',

    // Autres configs
    isDevelopment: import.meta.env.MODE === 'development',
    isProduction: import.meta.env.MODE === 'production',
}

export default config
