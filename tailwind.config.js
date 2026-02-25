/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Barlow', 'Instrument Sans', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1A9375',
          secondary: '#126550',
          50: '#E6F5F1',
          100: '#CCEBE3',
          200: '#99D7C7',
          300: '#66C3AB',
          400: '#33AF8F',
          500: '#1A9375',
          600: '#15765E',
          700: '#105947',
          800: '#0B3C2F',
          900: '#051F18',
        },
        surface: {
          page: '#f4f4f4',
          container: '#ffffff',
          stroke: '#dcdcdc',
          alternate: '#f4f4f4',
        },
        copy: {
          default: '#111115',
          muted: '#6f6f77',
          subtle: '#4e4e55',
        },
        border: {
          DEFAULT: 'rgba(39, 39, 42, 0.1)',
        },
        success: {
          DEFAULT: '#10b981',
          50: '#ecfdf5',
          100: '#d1fae5',
          700: '#047857',
        },
        danger: {
          DEFAULT: '#ef4444',
          50: '#fef2f2',
          100: '#fee2e2',
          700: '#b91c1c',
        },
        warning: {
          DEFAULT: '#f59e0b',
          50: '#fffbeb',
          100: '#fef3c7',
          700: '#b45309',
        },
      },
      spacing: {
        '2.5': '10px',
        'ds-8': '8px',
        'ds-10': '10px',
        'ds-12': '12px',
        'ds-16': '16px',
        'ds-24': '24px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(0, 0, 0, 0.05), inset 0 -1px 0 0 rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        card: '12px',
        button: '8px',
        input: '8px',
      },
    },
  },
  plugins: [],
};
