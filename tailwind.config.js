/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./youtube/youtube_script/index.html",
    "./youtube/youtube_script/src/**/*.{js,ts,jsx,tsx}",
    "./YOUTUBE/youtube_script/index.html",
    "./YOUTUBE/youtube_script/src/**/*.{js,ts,jsx,tsx}",
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
