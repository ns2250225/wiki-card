/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        bg: '#11131B',
        panel: '#1C2030',
        panel2: '#252a3d',
        ink: '#F5F5F7',
        muted: '#8b90a3',
        common: '#A5A9B5',
        rare: '#398BFF',
        epic: '#A45CFF',
        legendary: '#FFC247',
        mythic: '#FF5DB7',
      },
      fontFamily: {
        sans: [
          'Inter',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
