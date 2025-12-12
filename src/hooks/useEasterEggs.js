/**
 * 🎉 Easter Eggs Detection Hooks
 */

import { useState, useEffect, useRef } from 'react'

/**
 * Hook pour détecter X clics rapides sur un élément
 */
export function useMultiTap(targetRef, tapCount = 10, timeWindow = 3000) {
  const [triggered, setTriggered] = useState(false)
  const tapsRef = useRef([])

  useEffect(() => {
    const element = targetRef.current
    if (!element) return

    const handleClick = () => {
      const now = Date.now()
      tapsRef.current.push(now)

      // Nettoyer les anciens taps hors de la fenêtre temporelle
      tapsRef.current = tapsRef.current.filter(time => now - time < timeWindow)

      // Vérifier si on atteint le nombre de taps
      if (tapsRef.current.length >= tapCount) {
        setTriggered(true)
        tapsRef.current = []

        // Reset après animation
        setTimeout(() => setTriggered(false), 5000)
      }
    }

    element.addEventListener('click', handleClick)
    return () => element.removeEventListener('click', handleClick)
  }, [targetRef, tapCount, timeWindow])

  return triggered
}

/**
 * Hook pour détecter le Konami Code (↑↑↓↓←→←→BA)
 */
export function useKonamiCode() {
  const [activated, setActivated] = useState(false)
  const keysRef = useRef([])
  const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

  useEffect(() => {
    const handleKeyPress = (e) => {
      keysRef.current.push(e.key)
      keysRef.current = keysRef.current.slice(-konamiCode.length)

      // Vérifier si le code correspond
      if (keysRef.current.join('') === konamiCode.join('')) {
        setActivated(true)
        keysRef.current = []

        // Désactiver après 10s
        setTimeout(() => setActivated(false), 10000)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return activated
}

/**
 * Hook pour détecter un pattern de swipe (ex: ← → ← → ↑)
 */
export function useSwipePattern(pattern = ['left', 'right', 'left', 'right', 'up']) {
  const [activated, setActivated] = useState(false)
  const [touchStart, setTouchStart] = useState(null)
  const swipesRef = useRef([])

  const detectSwipe = (startX, startY, endX, endY) => {
    const diffX = endX - startX
    const diffY = endY - startY
    const threshold = 50

    if (Math.abs(diffX) > Math.abs(diffY)) {
      return diffX > threshold ? 'right' : diffX < -threshold ? 'left' : null
    } else {
      return diffY > threshold ? 'down' : diffY < -threshold ? 'up' : null
    }
  }

  useEffect(() => {
    const handleTouchStart = (e) => {
      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      })
    }

    const handleTouchEnd = (e) => {
      if (!touchStart) return

      const direction = detectSwipe(
        touchStart.x,
        touchStart.y,
        e.changedTouches[0].clientX,
        e.changedTouches[0].clientY
      )

      if (direction) {
        swipesRef.current.push(direction)
        swipesRef.current = swipesRef.current.slice(-pattern.length)

        if (swipesRef.current.join('') === pattern.join('')) {
          setActivated(true)
          swipesRef.current = []
          setTimeout(() => setActivated(false), 5000)
        }
      }

      setTouchStart(null)
    }

    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [touchStart, pattern])

  return activated
}

/**
 * Hook pour shake detection (secouer le téléphone)
 */
export function useShakeDetection(threshold = 15) {
  const [shaken, setShaken] = useState(false)
  const lastUpdate = useRef(Date.now())

  useEffect(() => {
    const handleMotion = (e) => {
      const acceleration = e.accelerationIncludingGravity
      if (!acceleration) return

      const now = Date.now()
      if (now - lastUpdate.current < 100) return

      lastUpdate.current = now

      const totalAcceleration = Math.abs(acceleration.x) + Math.abs(acceleration.y) + Math.abs(acceleration.z)

      if (totalAcceleration > threshold) {
        setShaken(true)
        setTimeout(() => setShaken(false), 3000)
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [threshold])

  return shaken
}
