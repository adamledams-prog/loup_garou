/**
 * 🔊 Gestionnaire Audio Simple - Fichiers réels
 * Utilise HTMLAudioElement pour jouer de vrais fichiers audio
 */

class AudioManager {
  constructor() {
    this.enabled = this.loadPreference()
    this.volume = this.loadVolume()
    this.sounds = {}
    this.currentMusic = null
    this.batInterval = null // Pour les sons aléatoires de chauve-souris
    this.kidsNamesInterval = null // Pour les prénoms des neveux
  }

  /**
   * Charge la préférence son depuis localStorage
   */
  loadPreference() {
    const saved = localStorage.getItem('soundEnabled')
    return saved === null ? true : saved === 'true'
  }

  /**
   * Charge le volume depuis localStorage
   */
  loadVolume() {
    const saved = localStorage.getItem('soundVolume')
    return saved ? parseFloat(saved) : 0.7
  }

  /**
   * Sauvegarder les préférences
   */
  savePreference() {
    localStorage.setItem('soundEnabled', this.enabled.toString())
  }

  saveVolume() {
    localStorage.setItem('soundVolume', this.volume.toString())
  }

  /**
   * Toggle son on/off
   */
  toggle() {
    this.enabled = !this.enabled
    this.savePreference()

    if (!this.enabled && this.currentMusic) {
      this.currentMusic.pause()
    }

    return this.enabled
  }

  /**
   * Changer le volume (0.0 à 1.0)
   */
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol))
    this.saveVolume()

    // Appliquer à tous les sons actifs
    Object.values(this.sounds).forEach(audio => {
      if (audio && !audio.paused) {
        audio.volume = this.volume
      }
    })

    if (this.currentMusic) {
      this.currentMusic.volume = this.volume * 0.3 // Musique plus douce
    }
  }

  /**
   * Jouer un fichier audio
   */
  play(name, { loop = false, volume = null } = {}) {
    if (!this.enabled) return null

    try {
      const audio = new Audio(`/${name}`)
      audio.volume = volume !== null ? volume : this.volume
      audio.loop = loop

      const playPromise = audio.play()
      if (playPromise) {
        playPromise.catch(e => {
          console.warn(`Audio ${name} bloqué:`, e)
        })
      }

      this.sounds[name] = audio
      return audio
    } catch (e) {
      console.error(`Erreur lecture ${name}:`, e)
      return null
    }
  }

  /**
   * Arrêter un son spécifique
   */
  stop(name) {
    if (this.sounds[name]) {
      this.sounds[name].pause()
      this.sounds[name].currentTime = 0
      delete this.sounds[name]
    }
  }

  /**
   * Arrêter tous les sons
   */
  stopAll() {
    Object.keys(this.sounds).forEach(name => this.stop(name))
    if (this.currentMusic) {
      this.currentMusic.pause()
      this.currentMusic = null
    }
  }

  // ===== SONS SPÉCIFIQUES DU JEU =====

  /**
   * 🐺 Hurlement de loup
   */
  playWolfHowl() {
    if (import.meta.env.DEV) console.log('🐺 Lecture hurlement de loup')
    return this.play('hurlement-loup.wav', { volume: this.volume * 0.9 })
  }

  /**
   * � Ambiance forêt nocturne (en boucle)
   */
  playForestAmbience() {
    if (this.sounds['forest_night.wav']) return // Déjà en cours

    if (import.meta.env.DEV) console.log('🌲 Lecture ambiance forêt nocturne')
    return this.play('forest_night.wav', {
      loop: true,
      volume: this.volume * 0.4 // Plus discret
    })
  }

  stopForestAmbience() {
    this.stop('forest_night.wav')
  }

  /**
   * 🦇 Son de chauve-souris aléatoire
   */
  playBatSound() {
    if (import.meta.env.DEV) console.log('🦇 Lecture son chauve-souris')
    return this.play('chauve_souris.wav', { volume: this.volume * 0.6 })
  }

  /**
   * 🦇 Démarrer les sons aléatoires de chauve-souris
   */
  startRandomBatSounds() {
    if (this.batInterval) return // Déjà démarré

    const playRandomBat = () => {
      if (this.enabled) {
        this.playBatSound()
      }
      // Rejouer entre 8 et 20 secondes aléatoirement
      const nextDelay = 8000 + Math.random() * 12000
      this.batInterval = setTimeout(playRandomBat, nextDelay)
    }

    // Premier son après 3-8 secondes
    const initialDelay = 3000 + Math.random() * 5000
    this.batInterval = setTimeout(playRandomBat, initialDelay)
  }

  stopRandomBatSounds() {
    if (this.batInterval) {
      clearTimeout(this.batInterval)
      this.batInterval = null
    }
  }

  /**
   * 👶 Prénoms des neveux (joués aléatoirement pendant la partie)
   */
  playRandomKidsName() {
    const names = ['fatima.mp3', 'naim.mp3', 'sarah.mp3']
    const randomName = names[Math.floor(Math.random() * names.length)]
    if (import.meta.env.DEV) console.log(`👶 Lecture prénom: ${randomName}`)
    return this.play(randomName, { volume: this.volume * 0.8 })
  }

  /**
   * 👶 Démarrer les prénoms aléatoires pendant la partie
   */
  startRandomKidsNames() {
    if (this.kidsNamesInterval) return // Déjà démarré

    const playRandomName = () => {
      if (this.enabled) {
        this.playRandomKidsName()
      }
      // Rejouer entre 45 et 90 secondes (plus espacé que les chauves-souris)
      const nextDelay = 45000 + Math.random() * 45000
      this.kidsNamesInterval = setTimeout(playRandomName, nextDelay)
    }

    // Premier nom après 20-40 secondes
    const initialDelay = 20000 + Math.random() * 20000
    this.kidsNamesInterval = setTimeout(playRandomName, initialDelay)
  }

  stopRandomKidsNames() {
    if (this.kidsNamesInterval) {
      clearTimeout(this.kidsNamesInterval)
      this.kidsNamesInterval = null
    }
  }

  /**
   * 🎨 Son choix d'avatar
   */
  playAvatarChoice() {
    if (import.meta.env.DEV) console.log('🎨 Lecture son choix avatar')
    return this.play('choix_avatars_ambiance.mp3', { volume: this.volume * 1.0 }) // Volume max pour bien entendre
  }

  /**
   * �🎵 Musique d'ambiance (si vous en ajoutez)
   */
  playAmbientMusic() {
    if (this.currentMusic) return

    this.currentMusic = this.play('ambient.mp3', {
      loop: true,
      volume: this.volume * 0.3
    })
  }

  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.pause()
      this.currentMusic = null
    }
  }

  /**
   * 🎮 SFX simples avec beep synthétique
   */
  playClick() {
    // Petit beep pour feedback
    this.beep(800, 50, 0.1)
  }

  playSuccess() {
    this.beep(600, 80, 0.15)
    setTimeout(() => this.beep(800, 80, 0.15), 100)
  }

  playError() {
    this.beep(200, 150, 0.2)
  }

  /**
   * Beep synthétique simple (fallback pour SFX)
   */
  beep(frequency = 440, duration = 100, volume = 0.1) {
    if (!this.enabled) return

    try {
      const context = new (window.AudioContext || window.webkitAudioContext)()
      const osc = context.createOscillator()
      const gain = context.createGain()

      osc.connect(gain)
      gain.connect(context.destination)

      osc.frequency.value = frequency
      osc.type = 'sine'

      gain.gain.setValueAtTime(volume * this.volume, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration / 1000)

      osc.start(context.currentTime)
      osc.stop(context.currentTime + duration / 1000)
    } catch (e) {
      // Silently fail si Web Audio pas supporté
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.stopRandomBatSounds()
    this.stopRandomKidsNames()
    this.stopAll()
  }
}

// Instance globale
export const audioManager = new AudioManager()

// Hook React (optionnel)
export function useAudioManager() {
  return audioManager
}
