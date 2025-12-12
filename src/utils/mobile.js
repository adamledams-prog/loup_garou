/**
 * 📱 Mobile Advanced Features
 * Vibration, Share API, Network quality, etc.
 */
import { useState, useEffect } from 'react'

/**
 * Vibration API (Haptic Feedback)
 */
export const vibrate = {
  // Feedback tactile simple
  tap() {
    if ('vibrate' in navigator) {
      navigator.vibrate(10) // 10ms
    }
  },

  // Click/Select
  click() {
    if ('vibrate' in navigator) {
      navigator.vibrate(20) // 20ms
    }
  },

  // Success
  success() {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]) // 3 courtes vibrations
    }
  },

  // Error
  error() {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]) // 2 longues avec pause
    }
  },

  // Vote
  vote() {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 30, 60]) // Crescendo
    }
  },

  // Death
  death() {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]) // Longue et intense
    }
  },

  // Ready
  ready() {
    if ('vibrate' in navigator) {
      navigator.vibrate([40, 40, 40, 40, 100]) // Montée + finale
    }
  },

  // Timer critical
  critical() {
    if ('vibrate' in navigator) {
      navigator.vibrate(80)
    }
  },

  // Stop all vibrations
  stop() {
    if ('vibrate' in navigator) {
      navigator.vibrate(0)
    }
  }
}

/**
 * Share API (Native mobile sharing)
 */
export async function shareRoomCode(roomCode) {
  if ('share' in navigator) {
    try {
      await navigator.share({
        title: '🐺 Loup-Garou Online',
        text: `Rejoins ma partie de Loup-Garou ! Code: ${roomCode}`,
        url: window.location.origin
      })
      return { success: true }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing:', err)
      }
      return { success: false, error: err }
    }
  } else {
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(roomCode)
      return { success: true, fallback: 'clipboard' }
    } catch (err) {
      return { success: false, error: err }
    }
  }
}

/**
 * Network Quality Detection
 */
export function getNetworkQuality() {
  if ('connection' in navigator) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

    if (!connection) return null

    const { effectiveType, downlink, rtt, saveData } = connection

    // Déterminer la qualité
    let quality = 'good'
    let color = 'green'
    let icon = '🟢'

    if (saveData) {
      quality = 'data-saver'
      color = 'orange'
      icon = '🟠'
    } else if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      quality = 'poor'
      color = 'red'
      icon = '🔴'
    } else if (effectiveType === '3g') {
      quality = 'average'
      color = 'yellow'
      icon = '🟡'
    } else if (effectiveType === '4g') {
      quality = 'good'
      color = 'green'
      icon = '🟢'
    }

    return {
      quality,
      color,
      icon,
      effectiveType,
      downlink: downlink ? `${downlink} Mb/s` : null,
      rtt: rtt ? `${rtt}ms` : null,
      saveData
    }
  }

  return null
}

/**
 * Hook React pour monitorer la qualité réseau
 */
export function useNetworkQuality() {
  const [networkInfo, setNetworkInfo] = useState(() => getNetworkQuality())

  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

    if (!connection) return

    const updateNetworkInfo = () => {
      setNetworkInfo(getNetworkQuality())
    }

    connection.addEventListener('change', updateNetworkInfo)
    return () => connection.removeEventListener('change', updateNetworkInfo)
  }, [])

  return networkInfo
}/**
 * Wake Lock API (Keep screen awake during game)
 */
let wakeLock = null

export async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen')
      console.log('🔆 Screen wake lock active')

      wakeLock.addEventListener('release', () => {
        console.log('💤 Screen wake lock released')
      })

      return true
    } catch (err) {
      console.error('Wake Lock error:', err)
      return false
    }
  }
  return false
}

export function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release()
    wakeLock = null
  }
}

/**
 * Battery Status (Check if user should save resources)
 */
export async function getBatteryStatus() {
  if ('getBattery' in navigator) {
    try {
      const battery = await navigator.getBattery()
      return {
        level: Math.round(battery.level * 100),
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      }
    } catch (err) {
      return null
    }
  }
  return null
}

/**
 * Install PWA Prompt
 */
let deferredPrompt = null

export function setupPWAInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // ⚠️ NE PAS appeler preventDefault() automatiquement
    // Stocker l'événement pour utilisation ultérieure
    deferredPrompt = e
    console.log('📱 PWA Install prompt disponible')
  })
}

export async function promptPWAInstall() {
  if (!deferredPrompt) {
    return { success: false, error: 'No install prompt available' }
  }

  // Maintenant on appelle prompt() pour afficher la bannière
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice

  console.log(`📱 Install prompt ${outcome}`)

  deferredPrompt = null

  return { success: outcome === 'accepted', outcome }
}

/**
 * Check if app is installed (PWA)
 */
export function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true
}
