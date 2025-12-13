# 🚀 Déploiement Railway avec Redis

## Variables d'environnement à ajouter sur Railway :

1. Aller sur **railway.app** → ton projet backend
2. **Settings** → **Variables**
3. Ajouter ces 2 variables :

```
UPSTASH_REDIS_REST_URL
https://exact-skink-12525.upstash.io

UPSTASH_REDIS_REST_TOKEN
ATDtAAIncDE5OWQ0OGE5YjM3MzQ0NDgyOWM3NDRjY2ViNGYyMjY1Y3AxMTI1MjU
```

4. **Redéployer** (Railway va redémarrer automatiquement)

## ✅ Test après déploiement

Aller sur : `https://ton-backend.up.railway.app/`

Tu devrais voir :
```json
{
  "status": "ok",
  "message": "🎮 Serveur Loup-Garou en ligne"
}
```

## 🎉 Résultat

- ✅ **Fini les "partie introuvable"** !
- ✅ Parties sauvegardées toutes les 5 secondes
- ✅ Reconnexion automatique après redémarrage serveur
- ✅ TTL de 24h sur les parties inactives

---

**Prêt à déployer !** 🚀
