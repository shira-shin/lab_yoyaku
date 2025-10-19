import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4A90E2",
          dark: "#3F7ACC",
        },
        accent: "#F5A623",
        success: "#7ED321",
        background: "#F8F9FA",
        muted: "#6C757D",
      },
      fontFamily: {
        sans: ["Open Sans", "Noto Sans JP", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
