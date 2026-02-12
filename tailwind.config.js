/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./youtube/apps/studio/index.html",
    "./youtube/apps/studio/src/**/*.{js,ts,jsx,tsx}",
    "./YOUTUBE/apps/studio/index.html",
    "./YOUTUBE/apps/studio/src/**/*.{js,ts,jsx,tsx}",
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
