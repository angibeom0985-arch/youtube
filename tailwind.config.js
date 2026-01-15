/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./youtube_script/index.html",
    "./youtube_script/src/**/*.{js,ts,jsx,tsx}",
    "./youtube_image/ui/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
};
