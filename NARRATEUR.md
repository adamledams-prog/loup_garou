# 🎭 Système de Narration - Documentation

## 📖 **Vue d'ensemble**

Le jeu intègre maintenant un **Narrateur immersif** qui raconte l'histoire pendant les transitions et chargements, créant une expérience plus cinématique et engageante.

---

## ✨ **Fonctionnalités implémentées**

### **1. Narration des Transitions de Phase** 🎬

Chaque changement de phase (Nuit → Jour → Vote) affiche :
- ✅ **Icône animée** (lune, soleil, balance)
- ✅ **Titre dramatique** (grosses lettres stylées)
- ✅ **Texte de narration** dans un cadre élégant
- ✅ **Points de chargement** animés (3 dots qui rebondissent)

#### **Textes de narration disponibles** :

**🌙 Nuit** (4 variantes aléatoires) :
- "La nuit X tombe sur le village... Les loups-garous ouvrent les yeux. 🐺"
- "Le silence de la nuit X est brisé par les hurlements lointains... 🌙"
- "Nuit X. Les créatures de l'ombre se réveillent... 🌑"
- "Pendant que le village dort, les forces obscures s'activent... Nuit X. 🦇"

**☀️ Jour** (4 variantes aléatoires) :
- "L'aube se lève sur le village... Que s'est-il passé cette nuit ? ☀️"
- "Le coq chante, les villageois se rassemblent sur la place... 🐓"
- "Un nouveau jour commence. Les habitants découvrent avec effroi... 🌅"
- "Le soleil révèle les horreurs de la nuit... Le village est en émoi. 🌄"

**⚖️ Vote** (4 variantes aléatoires) :
- "Il est temps de voter ! Qui doit être éliminé du village ? ⚖️"
- "Les villageois se réunissent pour désigner le coupable... 🗳️"
- "L'heure du jugement a sonné. Qui mérite la sentence ? ⚖️"
- "Le village doit choisir : qui sera banni aujourd'hui ? 👥"

---

### **2. Écran de Chargement Initial** 🌙

Quand le joueur se connecte à la partie :
- ✅ **Lune pulsante** (animation)
- ✅ **Titre élégant** : "Connexion à la partie..."
- ✅ **Narration mystérieuse** aléatoire
- ✅ **Barre de progression** animée (gradient rouge)
- ✅ **Points de chargement** (3 dots)
- ✅ **Texte d'info** : "Récupération de l'état de la partie..."

#### **Textes de chargement** (4 variantes) :
- "Les esprits de la nuit délibèrent... 🌙"
- "Le destin s'écrit dans l'ombre... 📜"
- "Les forces mystiques opèrent... ✨"
- "Le temps s'écoule lentement dans le village endormi... ⏳"

---

### **3. Overlay de Processing** 🌙

Pendant le traitement des actions de nuit (3 secondes) :
- ✅ **Lune qui tourne** (animation spin 3s)
- ✅ **Titre** : "La Nuit Opère..."
- ✅ **Narration** : "Les forces obscures accomplissent leurs sombres desseins..."
- ✅ **Background flouté** (backdrop-blur)
- ✅ **Points violets** animés (thème mystique)

---

### **4. Narration de Game Over** 🏁

À la fin de la partie :
- ✅ **Icône géante** (🎉 ou 🐺)
- ✅ **Titre dramatique** avec drop-shadow
- ✅ **Narration contextuelle** selon le gagnant
- ✅ **Cadre élégant** avec border stylée

#### **Textes de fin** :

**Victoire Villageois** 🎉 :
> "Le soleil se lève sur un village libéré. Les loups-garous ont été démasqués et vaincus. La paix est revenue..."

**Victoire Loups** 🐺 :
> "Les hurlements déchirent la nuit. Les loups-garous règnent désormais sur le village en ruines. L'obscurité a triomphé..."

---

## 🎨 **Détails de Design**

### **Cadres de narration**
```css
- Background: bg-night-800/50 + backdrop-blur-sm
- Border: 2px border-blood-600/30 (ou purple pour processing)
- Padding: p-6
- Border-radius: rounded-xl
- Texte: text-2xl italic leading-relaxed
```

### **Animations**
- **Icônes** : animate-bounce, animate-pulse, animate-spin
- **Overlay** : animate-fadeIn (entrée smooth)
- **Points de chargement** : animate-bounce avec delays (0ms, 150ms, 300ms)
- **Barre de progression** : gradient-to-r + animate-pulse

### **Couleurs thématiques**
- **Nuit** : Purple (🌙 mystique)
- **Jour** : Yellow/Orange (☀️ lumineux)
- **Vote** : Red (⚖️ jugement)
- **Processing** : Purple foncé (🔮 magie)
- **General** : Blood-red (🐺 thème principal)

---

## 🎯 **Impact sur l'expérience joueur**

### **Avant** ❌
- Transitions brutales et instantanées
- Chargements ennuyeux sans contexte
- Pas d'ambiance narrative
- Interface purement fonctionnelle

### **Après** ✅
- **Immersion narrative** forte
- **Attente valorisée** (narration pendant chargement)
- **Ambiance théâtrale** (comme un conteur d'histoires)
- **Transitions fluides** et élégantes
- **Expérience cinématique**

---

## 💡 **Ajouts futurs possibles**

### **🔊 Audio (optionnel)**
- Ajouter des sons d'ambiance :
  - 🌙 Nuit : Hurlements de loups
  - ☀️ Jour : Chant du coq
  - ⚖️ Vote : Gong dramatique
  - 💀 Mort : Son sinistre

### **🎭 Narration enrichie**
- Narration **spécifique par rôle** :
  - Voyante : "Vos visions pénètrent les ténèbres..."
  - Loup : "Votre faim de sang s'intensifie..."
  - Sorcière : "Vos potions frémissent d'anticipation..."

### **📜 Historique narratif**
- Ajouter les narrations dans l'historique des événements
- Les joueurs peuvent relire l'histoire de la partie

### **🎨 Effet machine à écrire**
- Animation CSS `typewriter-text` (déjà créée mais non utilisée)
- Effet de texte qui s'écrit lettre par lettre

---

## 🛠️ **Fonctions techniques**

### **`getNarration(phase, nightNumber, context)`**
Retourne une narration aléatoire selon la phase.

**Paramètres** :
- `phase` : 'night' | 'day' | 'vote' | 'loading'
- `nightNumber` : Numéro de la nuit (pour texte dynamique)
- `context` : Objet optionnel pour contexte additionnel

**Retour** : String (texte de narration)

**Utilisation** :
```jsx
<p className="text-2xl italic">
  "{getNarration('night', nightNumber)}"
</p>
```

---

## 🎬 **États d'affichage**

### **1. Phase Transition** (`phaseTransition`)
- Déclencheur : Changement de phase (night/day/vote)
- Durée : 2.5 secondes
- Z-index : 50
- Full-screen overlay

### **2. Processing** (`isProcessing`)
- Déclencheur : Traitement actions de nuit côté serveur
- Durée : ~3 secondes (ou jusqu'à `dayPhase`)
- Z-index : 50
- Thème mystique (violet)

### **3. Loading** (`isLoading`)
- Déclencheur : Connexion initiale au jeu
- Durée : Variable (jusqu'à réception `gameState`)
- Narration de "chargement"

### **4. Game Over** (`gameOver`)
- Déclencheur : Fin de partie
- Narration contextuelle (victoire/défaite)
- Affichage permanent jusqu'à replay

---

## 📊 **Statistiques d'utilisation**

- **4 narrations** par type de phase
- **16 textes** uniques au total
- **Rotation aléatoire** (via `Math.random()`)
- **Aucune répétition** garantie dans la même session (probabilité faible)

---

## 🎮 **Recommandations UX**

### **Pour les enfants (11 ans)**
✅ Les narrations ajoutent du **storytelling**
✅ Rend l'attente **moins frustrante**
✅ **Ambiance de conte** engageante
✅ Textes **courts et dynamiques** (pas de pavés)

### **Pour les adultes**
✅ Crée une **ambiance immersive**
✅ Aide à **comprendre le contexte** (nuit/jour/vote)
✅ **Élégant** et non intrusif
✅ Peut être **skip** (transitions courtes)

---

## 🚀 **Compatibilité**

- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Mobile (responsive design)
- ✅ Tablette (animations fluides)
- ✅ Pas d'impact performance (CSS pur)
- ✅ Accessible (textes lisibles, contrastes élevés)

---

## 🎯 **Conclusion**

Le système de narration transforme le jeu d'une **interface fonctionnelle** en une **expérience narrative immersive**. Les transitions ne sont plus des interruptions mais des **moments cinématiques** qui renforcent l'atmosphère du jeu.

**Résultat** : Un Loup-Garou qui **raconte une histoire** plutôt que de simplement exécuter des règles. 🐺📖✨
