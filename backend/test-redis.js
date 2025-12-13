// 🧪 Test de connexion Redis Upstash
// Execute: node test-redis.js

require('dotenv').config();
const { Redis } = require('@upstash/redis');

async function testRedis() {
    console.log('🔍 Test de connexion Redis...\n');

    // Vérifier les variables d'environnement
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.error('❌ ERREUR: Variables d\'environnement Redis manquantes !');
        console.log('\n📝 Ajouter dans backend/.env :');
        console.log('UPSTASH_REDIS_REST_URL=https://xxxxxxx.upstash.io');
        console.log('UPSTASH_REDIS_REST_TOKEN=AXXXXxxxxxxxxxxx\n');
        process.exit(1);
    }

    try {
        // Créer le client Redis
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        console.log('✅ Client Redis créé');

        // Test 1: Ping
        const pong = await redis.ping();
        console.log(`✅ Ping: ${pong}`);

        // Test 2: Set/Get
        const testKey = 'test:room:ABC123';
        const testData = {
            code: 'ABC123',
            players: [
                { id: '1', name: 'Joueur 1', role: 'loup' },
                { id: '2', name: 'Joueur 2', role: 'villageois' }
            ],
            phase: 'night'
        };

        await redis.setex(testKey, 60, JSON.stringify(testData));
        console.log('✅ Données de test sauvegardées');

        const retrieved = await redis.get(testKey);
        const parsed = typeof retrieved === 'string' ? JSON.parse(retrieved) : retrieved;
        console.log('✅ Données récupérées:', parsed);

        // Test 3: TTL
        const ttl = await redis.ttl(testKey);
        console.log(`✅ TTL: ${ttl} secondes`);

        // Nettoyer
        await redis.del(testKey);
        console.log('✅ Données de test supprimées');

        console.log('\n🎉 Redis fonctionne parfaitement !');
        console.log('✅ Vous pouvez maintenant utiliser server.js avec Redis\n');

    } catch (error) {
        console.error('\n❌ ERREUR Redis:', error.message);
        console.log('\n🔍 Vérifier:');
        console.log('1. Les credentials Upstash sont corrects');
        console.log('2. La base Redis est active sur upstash.com');
        console.log('3. Pas de firewall qui bloque la connexion\n');
        process.exit(1);
    }
}

testRedis();
