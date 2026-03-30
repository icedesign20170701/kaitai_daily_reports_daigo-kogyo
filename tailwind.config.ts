import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(24 10% 84%)",
        input: "hsl(24 10% 84%)",
        ring: "hsl(24 88% 44%)",
        background: "hsl(40 33% 97%)",
        foreground: "hsl(25 18% 12%)",
        primary: {
          DEFAULT: "hsl(24 88% 44%)",
          foreground: "hsl(40 33% 98%)",
        },
        secondary: {
          DEFAULT: "hsl(35 22% 90%)",
          foreground: "hsl(25 18% 16%)",
        },
        muted: {
          DEFAULT: "hsl(36 18% 92%)",
          foreground: "hsl(24 10% 38%)",
        },
        accent: {
          DEFAULT: "hsl(40 50% 88%)",
          foreground: "hsl(25 18% 14%)",
        },
        destructive: {
          DEFAULT: "hsl(0 70% 46%)",
          foreground: "hsl(40 33% 98%)",
        },
        card: {
          DEFAULT: "hsl(40 33% 99%)",
          foreground: "hsl(25 18% 12%)",
        },
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
      },
      boxShadow: {
        soft: "0 10px 30px -18px rgba(75, 44, 17, 0.25)",
      },
    },
  },
  plugins: [],
} satisfies Config;
