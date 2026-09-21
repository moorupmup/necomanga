import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: 'class',
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './plugins/**/*.{js,ts}',
    './app.{js,ts,vue}',
    './app.vue'
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: 'oklch(0.145 0.005 260)',          // Deepest zinc-black (#09090b)
          surface: 'oklch(0.18 0.006 260)',     // Card background (#121215)
          card: 'oklch(0.21 0.006 260)',        // Card surface (#18181b)
          border: 'oklch(0.27 0.006 260)',      // Subtle border (#27272a)
          muted: 'oklch(0.55 0.01 260)',        // Muted text (#71717a)
        }
      },
      fontSize: {
        '2xs': ['14px', '20px'],
        xs: ['14px', '20px'],
        sm: ['15px', '22px'],
        base: ['16px', '24px'],
        lg: ['18px', '26px'],
        xl: ['21px', '28px'],
        '2xl': ['26px', '34px'],
        '3xl': ['32px', '40px'],
        '4xl': ['40px', '48px'],
        '5xl': ['52px', '60px'],
      }
    }
  }
}
