import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          main: "#070B18",
          card: "#0D1324",
          "card-soft": "#111A2E",
          hover: "#17213A",
        },
        primary: {
          DEFAULT: "#4F7CFF",
          hover: "#6D92FF",
        },
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
        cyan: "#22D3EE",
        purple: "#A855F7",
        border: "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "PingFang SC",
          "Microsoft YaHei",
          "Noto Sans SC",
          "sans-serif",
        ],
        mono: ["Inter", "SF Mono", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        xl2: "18px",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #4F7CFF 0%, #22D3EE 55%, #A855F7 100%)",
        "dark-radial":
          "radial-gradient(ellipse at top, rgba(79,124,255,0.12), transparent 60%), radial-gradient(ellipse at bottom, rgba(168,85,247,0.08), transparent 50%)",
      },
      boxShadow: {
        glow: "0 0 24px rgba(79, 124, 255, 0.35)",
        card: "0 20px 60px rgba(0, 0, 0, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
