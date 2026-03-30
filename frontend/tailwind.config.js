/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        accent: {
          DEFAULT: 'var(--accent)',
          muted: 'var(--accent-muted)',
        },
        severity: {
          critical: 'var(--severity-critical)',
          high: 'var(--severity-high)',
          medium: 'var(--severity-medium)',
          low: 'var(--severity-low)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        destructive: 'var(--destructive)',
        info: 'var(--info)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(0, 240, 255, 0.3), 0 0 40px rgba(0, 240, 255, 0.1)',
        'glow-critical': '0 0 20px rgba(255, 45, 85, 0.3), 0 0 40px rgba(255, 45, 85, 0.1)',
        'glow-high': '0 0 20px rgba(255, 107, 53, 0.3), 0 0 40px rgba(255, 107, 53, 0.1)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 400ms ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}