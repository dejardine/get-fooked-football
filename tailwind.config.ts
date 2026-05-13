import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neobrutalist neon palette — bright accents on near-black.
        ink: '#0a0a0a',
        paper: '#f5f3ec',
        neon: {
          lime: '#c6ff3a',
          cyan: '#3affff',
          pink: '#ff3da3',
          yellow: '#ffd23f',
          orange: '#ff7a3d',
          purple: '#9b6bff',
          red: '#ff3d3d',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Helvetica Neue"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        brutal: '6px 6px 0 0 #000',
        'brutal-sm': '3px 3px 0 0 #000',
        'brutal-lg': '10px 10px 0 0 #000',
        'brutal-neon': '6px 6px 0 0 #c6ff3a',
      },
    },
  },
  plugins: [],
};

export default config;
