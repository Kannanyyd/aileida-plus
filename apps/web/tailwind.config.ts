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
          main: "#060912",
          card: "#0C1220",
          "card-soft": "#10182B",
          hover: "#16203A",
        },
        primary: {
          DEFAULT: "#5B8FFF",
          hover: "#82B4FF",
        },
        success: "#2DD4BF",
        danger: "#F4637A",
        warning: "#FBBF52",
        cyan: "#22D3EE",
        purple: "#A78BFA",
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
          "linear-gradient(135deg, #5B8FFF 0%, #22D3EE 50%, #A78BFA 100%)",
        "dark-radial":
          "radial-gradient(ellipse at top, rgba(91,143,255,0.10), transparent 60%), radial-gradient(ellipse at bottom right, rgba(167,139,250,0.06), transparent 50%)",
      },
      boxShadow: {
        glow: "0 0 24px rgba(91, 124, 255, 0.35)",
        card: "0 20px 60px rgba(0, 0, 0, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
