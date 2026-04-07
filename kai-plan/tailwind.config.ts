import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  // Single glob so every `src/` file that uses Tailwind classes is scanned (lib/, hooks/, etc.).
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        phase: {
          hypertrophy: "hsl(var(--phase-hypertrophy))",
          strength: "hsl(var(--phase-strength))",
          recovery: "hsl(var(--phase-recovery))",
          rest: "hsl(var(--phase-rest))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 rgb(255 255 255 / 0.04) inset, 0 4px 24px rgb(0 0 0 / 0.35), 0 0 0 1px rgb(255 255 255 / 0.05)",
        "card-lg":
          "0 1px 0 rgb(255 255 255 / 0.05) inset, 0 12px 40px rgb(0 0 0 / 0.45), 0 0 0 1px rgb(255 255 255 / 0.06)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
