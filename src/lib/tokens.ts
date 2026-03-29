// Design tokens for SourceVault
// Restrained, monochrome-first, minimal decoration

export const tokens = {
  // Color palette - neutral base with sparse accents
  colors: {
    // Grayscale foundation
    gray: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },

    // Sparse semantic colors
    trust: {
      high: '#16a34a',
      medium: '#ca8a04',
      low: '#dc2626',
    },

    // Functional colors
    link: '#2563eb',
    linkHover: '#1d4ed8',

    // UI states
    border: '#e5e5e5',
    borderHover: '#d4d4d4',
    background: '#ffffff',
    backgroundAlt: '#fafafa',
    text: '#171717',
    textSecondary: '#525252',
    textTertiary: '#737373',
  },

  // Typography scale - calm, readable
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
  },

  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },

  // Spacing scale - controlled rhythm
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
  },

  // Border radius - narrow, restrained
  radius: {
    none: '0',
    sm: '0.125rem',  // 2px
    base: '0.25rem', // 4px
    md: '0.375rem',  // 6px
  },

  // Shadows - minimal, almost none
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
  },

  // Layout
  maxWidth: {
    content: '1280px',
    narrow: '640px',
    wide: '1536px',
  },
} as const;
