import type { Config } from 'tailwindcss';
export default {
  content:['./src/**/*.{js,ts,jsx,tsx}'],
  theme:{extend:{colors:{foresight:'#7655e8'},fontFamily:{sans:['DM Sans','Arial','sans-serif']}}},
  plugins:[],
} satisfies Config;
