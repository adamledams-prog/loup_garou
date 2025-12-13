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
    console.log('🐺 Lecture hurlement de loup')
    return this.play('hurlement-loup.wav', { volume: this.volume * 0.9 })
  }

  /**
   * 🎵 Musique d'ambiance (si vous en ajoutez)
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
    this.stopAll()
  }
}

// Instance globale
export const audioManager = new AudioManager()

// Hook React (optionnel)
export function useAudioManager() {
  return audioManager
}
