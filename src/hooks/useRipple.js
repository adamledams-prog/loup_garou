import { useEffect } from 'react'

/**
 * Hook pour ajouter un effet ripple aux clics
 * @param {React.RefObject} ref - Référence à l'élément DOM
 */
export const useRipple = (ref) => {
    useEffect(() => {
        const element = ref.current
        if (!element) return

        const createRipple = (event) => {
            const button = event.currentTarget
            const rect = button.getBoundingClientRect()

            const circle = document.createElement('span')
            const diameter = Math.max(rect.width, rect.height)
            const radius = diameter / 2

            circle.style.width = circle.style.height = `${diameter}px`
            circle.style.left = `${event.clientX - rect.left - radius}px`
            circle.style.top = `${event.clientY - rect.top - radius}px`
            circle.classList.add('ripple')

            const ripple = button.getElementsByClassName('ripple')[0]
            if (ripple) {
                ripple.remove()
            }

            button.appendChild(circle)

            // Retirer après l'animation
            setTimeout(() => {
                circle.remove()
            }, 600)
        }

        element.addEventListener('click', createRipple)

        return () => {
            element.removeEventListener('click', createRipple)
        }
    }, [ref])
}

/**
 * Hook pour animer un checkmark
 * @param {boolean} success - État de succès
 * @param {Function} callback - Callback après l'animation
 */
export const useCheckmarkAnimation = (success, callback) => {
    useEffect(() => {
        if (success && callback) {
            const timer = setTimeout(callback, 600)
            return () => clearTimeout(timer)
        }
    }, [success, callback])
}

/**
 * Hook pour shake error
 * @param {boolean} error - État d'erreur
 * @param {React.RefObject} ref - Référence à l'élément
 */
export const useErrorShake = (error, ref) => {
    useEffect(() => {
        if (error && ref.current) {
            ref.current.classList.add('error-shake')
            const timer = setTimeout(() => {
                ref.current?.classList.remove('error-shake')
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [error, ref])
}
