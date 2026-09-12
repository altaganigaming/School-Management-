import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef4ff", 100: "#dce7fd", 200: "#c0d4fc",
          300: "#94b8fa", 400: "#6192f5", 500: "#3d6bef",
          600: "#274ce4", 700: "#1f39d1", 800: "#2031a9",
          900: "#1f2d85", 950: "#171e51"
        },
        accent: {
          400: "#fbbf24", 500: "#f59e0b", 600: "#d97706"
        }
      },
      fontFamily: {
        display: ["Georgia", "serif"],
      }
    },
  },
  plugins: [],
};
export default config;
