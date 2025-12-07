/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                blood: {
                    50: '#fee',
                    100: '#fcc',
                    200: '#faa',
                    300: '#f88',
                    400: '#f44',
                    500: '#dc2626',
                    600: '#b91c1c',
                    700: '#991b1b',
                    800: '#7f1d1d',
                    900: '#450a0a',
                },
                night: {
                    50: '#1e1e2e',
                    100: '#181825',
                    200: '#13131f',
                    300: '#0f0f1a',
                    400: '#0a0a14',
                    500: '#050510',
                    600: '#03030c',
                    700: '#020208',
                    800: '#010105',
                    900: '#000000',
                },
            },
            animation: {
                'float': 'float 3s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                glow: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
            },
        },
    },
    plugins: [],
}
