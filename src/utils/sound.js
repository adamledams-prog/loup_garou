/**
 * 🔊 Système audio pour Loup-Garou
 * Utilise Web Audio API pour SFX et musique
 */

class SoundManager {
  constructor() {
    this.enabled = this.loadPreference()
    this.volume = this.loadVolume()
    this.audioContext = null
    this.sounds = {}
    this.music = null
    this.musicGainNode = null

    // Initialiser au premier geste utilisateur
    this.initialized = false
  }

  /**
   * Initialise l'AudioContext (doit être appelé après interaction utilisateur)
   */
  init() {
    if (this.initialized) return

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      this.initialized = true
      console.log('🔊 Audio system initialized')
    } catch (e) {
      console.warn('Web Audio API not supported', e)
    }
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
    return saved ? parseFloat(saved) : 0.5
  }

  /**
   * Active/désactive le son
   */
  toggle() {
    this.enabled = !this.enabled
    localStorage.setItem('soundEnabled', this.enabled)

    if (!this.enabled && this.music) {
      this.stopMusic()
    }

    return this.enabled
  }

  /**
   * Change le volume (0-1)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume))
    localStorage.setItem('soundVolume', this.volume)

    if (this.musicGainNode) {
      this.musicGainNode.gain.value = this.volume * 0.3 // Musique plus douce
    }
  }

  /**
   * Joue un son synthétisé (pas besoin de fichiers audio)
   */
  playSynth(type, frequency, duration) {
    if (!this.enabled || !this.initialized) return

    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      oscillator.type = type
      oscillator.frequency.value = frequency

      gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)

      oscillator.start()
      oscillator.stop(this.audioContext.currentTime + duration)
    } catch (e) {
      console.warn('Error playing synth', e)
    }
  }

  /**
   * SFX : Clic/Tap
   */
  playClick() {
    this.playSynth('sine', 800, 0.05)
  }

  /**
   * SFX : Vote
   */
  playVote() {
    this.playSynth('triangle', 440, 0.15)
    setTimeout(() => this.playSynth('triangle', 550, 0.1), 100)
  }

  /**
   * SFX : Ready
   */
  playReady() {
    this.playSynth('sine', 523.25, 0.1) // Do
    setTimeout(() => this.playSynth('sine', 659.25, 0.15), 100) // Mi
  }

  /**
   * SFX : Mort/Death
   */
  playDeath() {
    this.playSynth('sawtooth', 220, 0.3)
    setTimeout(() => this.playSynth('sawtooth', 110, 0.4), 200)
  }

  /**
   * SFX : Victoire
   */
  playVictory() {
    const notes = [523.25, 587.33, 659.25, 783.99]
    notes.forEach((note, i) => {
      setTimeout(() => this.playSynth('sine', note, 0.2), i * 150)
    })
  }

  /**
   * SFX : Défaite
   */
  playDefeat() {
    const notes = [440, 392, 349.23, 293.66]
    notes.forEach((note, i) => {
      setTimeout(() => this.playSynth('sawtooth', note, 0.25), i * 150)
    })
  }

  /**
   * SFX : Timer critique (<10s)
   */
  playTimerCritical() {
    this.playSynth('square', 1000, 0.08)
  }

  /**
   * SFX : Timer fini
   */
  playTimerEnd() {
    this.playSynth('sine', 880, 0.1)
    setTimeout(() => this.playSynth('sine', 880, 0.1), 150)
    setTimeout(() => this.playSynth('sine', 880, 0.2), 300)
  }

  /**
   * SFX : Phase change (nuit/jour)
   */
  playPhaseChange(phase) {
    if (phase === 'night') {
      // Descente mystérieuse
      this.playSynth('sine', 440, 0.3)
      setTimeout(() => this.playSynth('sine', 330, 0.4), 200)
    } else {
      // Montée joyeuse
      this.playSynth('sine', 330, 0.3)
      setTimeout(() => this.playSynth('sine', 440, 0.4), 200)
    }
  }

  /**
   * SFX : Message chat
   */
  playMessage() {
    this.playSynth('sine', 600, 0.05)
  }

  /**
   * SFX : Erreur
   */
  playError() {
    this.playSynth('sawtooth', 200, 0.15)
    setTimeout(() => this.playSynth('sawtooth', 150, 0.2), 100)
  }

  /**
   * SFX : Success
   */
  playSuccess() {
    this.playSynth('sine', 523.25, 0.1)
    setTimeout(() => this.playSynth('sine', 659.25, 0.1), 80)
    setTimeout(() => this.playSynth('sine', 783.99, 0.15), 160)
  }

  /**
   * SFX : Notification
   */
  playNotification() {
    this.playSynth('sine', 880, 0.1)
    setTimeout(() => this.playSynth('sine', 1046.5, 0.15), 100)
  }

  /**
   * Musique d'ambiance (boucle d'accords sombres)
   */
  playAmbientMusic() {
    if (!this.enabled || !this.initialized || this.music) return

    try {
      // Créer un gain node pour le volume
      this.musicGainNode = this.audioContext.createGain()
      this.musicGainNode.gain.value = this.volume * 0.3 // Musique douce
      this.musicGainNode.connect(this.audioContext.destination)

      // Boucle d'ambiance sombre (simulée avec oscillateurs)
      this.music = setInterval(() => {
        if (!this.enabled) return

        // Accord mineur mystérieux
        const notes = [110, 130.81, 146.83] // La, Do#, Ré (La mineur)
        notes.forEach(freq => {
          const osc = this.audioContext.createOscillator()
          const gain = this.audioContext.createGain()

          osc.connect(gain)
          gain.connect(this.musicGainNode)

          osc.type = 'sine'
          osc.frequency.value = freq
          gain.gain.setValueAtTime(0.05, this.audioContext.currentTime)

          osc.start()
          osc.stop(this.audioContext.currentTime + 2)
        })
      }, 3000) // Toutes les 3 secondes

    } catch (e) {
      console.warn('Error playing ambient music', e)
    }
  }

  /**
   * Arrête la musique d'ambiance
   */
  stopMusic() {
    if (this.music) {
      clearInterval(this.music)
      this.music = null
    }
  }

  /**
   * Nettoie les ressources
   */
  cleanup() {
    this.stopMusic()
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
    }
  }
}

// Export singleton
export const soundManager = new SoundManager()

// Hook React pour gérer le son
export function useSoundManager() {
  return soundManager
}
