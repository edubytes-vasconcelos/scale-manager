/** @type {import('tailwindcss').Config} */
const path = require("path");

module.exports = {
  darkMode: ["class"],
  content: [
    path.join(__dirname, "index.html"),
    path.join(__dirname, "src/**/*.{ts,tsx,js,jsx}"),
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        /* =========================
           BASE (shadcn / CSS vars)
        ========================== */
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

        /* =========================
           TOKENS SEMANTICOS
        ========================== */
        success: {
          100: "#DCFCE7",
          500: "#22C55E",
          600: "#16A34A",
          700: "#166534",
          DEFAULT: "#22C55E",
          foreground: "#052E16",
        },

        warning: {
          100: "#FEF3C7",
          500: "#F59E0B",
          600: "#D97706",
          700: "#92400E",
          DEFAULT: "#F59E0B",
          foreground: "#451A03",
        },

        info: {
          100: "#E0F2FE",
          500: "#0EA5E9",
          600: "#0284C7",
          700: "#075985",
          DEFAULT: "#0EA5E9",
          foreground: "#082F49",
        },

        /* =========================
           NEUTROS RICOS
        ========================== */
        surface: "#FFFFFF",
        mutedText: "#64748B",
        subtleText: "#94A3B8",
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
