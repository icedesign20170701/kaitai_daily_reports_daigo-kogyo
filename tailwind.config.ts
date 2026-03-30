import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(214 18% 82%)",
        input: "hsl(214 18% 82%)",
        ring: "hsl(201 92% 45%)",
        background: "hsl(210 33% 97%)",
        foreground: "hsl(218 28% 14%)",
        primary: {
          DEFAULT: "hsl(206 79% 43%)",
          foreground: "hsl(210 40% 98%)",
        },
        secondary: {
          DEFAULT: "hsl(211 28% 91%)",
          foreground: "hsl(218 28% 18%)",
        },
        muted: {
          DEFAULT: "hsl(210 25% 92%)",
          foreground: "hsl(215 14% 38%)",
        },
        accent: {
          DEFAULT: "hsl(204 32% 88%)",
          foreground: "hsl(218 28% 16%)",
        },
        destructive: {
          DEFAULT: "hsl(0 70% 46%)",
          foreground: "hsl(210 40% 98%)",
        },
        card: {
          DEFAULT: "hsla(0 0% 100% / 0.78)",
          foreground: "hsl(218 28% 14%)",
        },
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
      },
      boxShadow: {
        soft: "0 18px 50px -28px rgba(15, 23, 42, 0.32)",
      },
    },
  },
  plugins: [],
} satisfies Config;
