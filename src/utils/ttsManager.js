/**
 * 🎙️ Gestionnaire TTS avec ElevenLabs
 * Lit les messages des bots IA à voix haute
 */

class TTSManager {
  constructor() {
    this.apiKey = 'sk_a36b8f40d03feeb6efeb62ac3aae28195152924a44cb790c'
    this.voiceId = 'pNInz6obpgDQGcFmaJgB' // Voix "Adam" (neutre, claire)
    this.enabled = this.loadPreference()
    this.currentAudio = null
    this.queue = []
    this.isPlaying = false
  }

  /**
   * Charge la préférence TTS depuis localStorage
   */
  loadPreference() {
    const saved = localStorage.getItem('ttsEnabled')
    return saved === null ? true : saved === 'true' // Activé par défaut
  }

  /**
   * Sauvegarder la préférence
   */
  savePreference() {
    localStorage.setItem('ttsEnabled', this.enabled.toString())
  }

  /**
   * Toggle TTS on/off
   */
  toggle() {
    this.enabled = !this.enabled
    this.savePreference()

    if (!this.enabled && this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
      this.queue = []
      this.isPlaying = false
    }

    return this.enabled
  }

  /**
   * Générer et lire un message avec ElevenLabs
   */
  async speak(text, playerName = 'Bot') {
    if (!this.enabled) return
    if (!text || text.trim().length === 0) return

    // Ajouter à la queue
    this.queue.push({ text, playerName })

    // Si déjà en train de jouer, attendre
    if (this.isPlaying) return

    // Jouer la queue
    await this.playQueue()
  }

  /**
   * Jouer tous les messages dans la queue
   */
  async playQueue() {
    if (this.queue.length === 0) {
      this.isPlaying = false
      return
    }

    this.isPlaying = true
    const { text, playerName } = this.queue.shift()

    try {
      console.log(`🎙️ TTS: ${playerName} dit: "${text}"`)

      // Appeler l'API ElevenLabs
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2', // Support français
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.5,
              use_speaker_boost: true
            }
          })
        }
      )

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`)
      }

      // Convertir la réponse en blob
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      // Créer et jouer l'audio
      this.currentAudio = new Audio(audioUrl)
      this.currentAudio.volume = 0.8
      this.currentAudio.playbackRate = 1.5 // ⚡ Accélérer x1.5 pour dynamisme

      // Quand l'audio se termine, jouer le suivant
      this.currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl) // Libérer la mémoire
        this.currentAudio = null
        this.playQueue() // Jouer le suivant
      }

      this.currentAudio.onerror = () => {
        console.error('❌ Erreur lecture audio TTS')
        URL.revokeObjectURL(audioUrl)
        this.currentAudio = null
        this.playQueue() // Continuer quand même
      }

      await this.currentAudio.play()

    } catch (error) {
      console.error('❌ Erreur TTS:', error)
      // Continuer la queue même en cas d'erreur
      this.playQueue()
    }
  }

  /**
   * Arrêter tous les audios TTS
   */
  stopAll() {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }
    this.queue = []
    this.isPlaying = false
  }

  /**
   * Changer de voix (optionnel)
   * Voix françaises disponibles:
   * - pNInz6obpgDQGcFmaJgB (Adam) - Neutre
   * - ErXwobaYiN019PkySvjV (Antoni) - Chaud
   * - VR6AewLTigWG4xSOukaG (Arnold) - Grave
   */
  setVoice(voiceId) {
    this.voiceId = voiceId
  }
}

// Export singleton
export const ttsManager = new TTSManager()
