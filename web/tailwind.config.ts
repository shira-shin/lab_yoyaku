import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/utils/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        border: "#E5E7EB",
        input: "#E5E7EB",
        ring: "#4A90E2",
        background: "#F8F9FA",
        foreground: "#1F2937",
        primary: {
          DEFAULT: "#4A90E2",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F3F4F6",
          foreground: "#1F2937",
        },
        muted: {
          DEFAULT: "#6C757D",
          foreground: "#F8F9FA",
        },
        accent: {
          DEFAULT: "#F5A623",
          foreground: "#1F2937",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#7ED321",
          foreground: "#05400A",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#1F2937",
        },
        info: {
          DEFAULT: "#38BDF8",
          foreground: "#0B1120",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#1F2937",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1F2937",
        },
      },
      borderRadius: {
        lg: "12px",
        md: "10px",
        sm: "8px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 4px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: ["Open Sans", "Noto Sans JP", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
