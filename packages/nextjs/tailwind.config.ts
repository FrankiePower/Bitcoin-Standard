/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
  ],

  darkTheme: "dark",

  themes: [
    {
      light: {
        primary: "#F7931A",
        "primary-content": "#FFFFFF",
        secondary: "#E5E7EB",
        "secondary-content": "#000000",
        accent: "#F7931A",
        "accent-content": "#FFFFFF",
        neutral: "#000000",
        "neutral-content": "#FFFFFF",
        "base-100": "#FFFFFF",
        "base-200": "#F3F4F6",
        "base-300": "#E5E7EB",
        "base-content": "#000000",
        info: "#3B82F6",
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
        ".bg-gradient-modal": {
          background: "#FFFFFF",
        },
        ".bg-modal": {
          background: "#FFFFFF",
        },
        ".modal-border": {
          border: "1px solid #E5E7EB",
        },
        ".bg-gradient-nav": {
          background: "#FFFFFF",
        },
        ".bg-main": {
          background: "#FFFFFF",
        },
        ".bg-underline": {
          background: "#F7931A",
        },
        ".bg-container": {
          background: "transparent",
        },
        ".bg-btn-wallet": {
          background: "#F7931A",
        },
        ".bg-input": {
          background: "rgba(0, 0, 0, 0.07)",
        },
        ".bg-component": {
          background: "rgba(255, 255, 255, 0.55)",
        },
        ".bg-function": {
          background: "rgba(247, 147, 26, 0.2)",
        },
        ".text-function": {
          color: "#F7931A",
        },
        ".text-network": {
          color: "#F7931A",
        },
        "--rounded-btn": "9999rem",

        ".tooltip": {
          "--tooltip-tail": "6px",
        },
        ".link": {
          textUnderlineOffset: "2px",
        },
        ".link:hover": {
          opacity: "80%",
        },
        ".contract-content": {
          background: "white",
        },
      },
    },
    {
      dark: {
        primary: "#F7931A",
        "primary-content": "#FFFFFF",
        secondary: "#333333",
        "secondary-content": "#FFFFFF",
        accent: "#F7931A",
        "accent-content": "#FFFFFF",
        neutral: "#222222",
        "neutral-content": "#FFFFFF",
        "base-100": "#000000",
        "base-200": "#111111",
        "base-300": "#222222",
        "base-content": "#FFFFFF",
        info: "#3B82F6",
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
        ".bg-gradient-modal": {
          background: "#111111",
        },
        ".bg-modal": {
          background: "#000000",
        },
        ".modal-border": {
          border: "1px solid #333333",
        },
        ".bg-gradient-nav": {
          "background-image":
            "linear-gradient(90deg, #F7931A 0%, #000000 100%)",
        },
        ".bg-main": {
          background: "#000000",
        },
        ".bg-underline": {
          background: "#F7931A",
        },
        ".bg-container": {
          background: "#0A0A0A",
        },
        ".bg-btn-wallet": {
          "background-image":
            "linear-gradient(180deg, #F7931A 0%, #D97706 100%)",
        },
        ".bg-input": {
          background: "rgba(255, 255, 255, 0.07)",
        },
        ".bg-component": {
          background: "#111111",
        },
        ".bg-function": {
          background: "rgba(247, 147, 26, 0.2)",
        },
        ".text-function": {
          color: "#F7931A",
        },
        ".text-network": {
          color: "#F7931A",
        },

        "--rounded-btn": "9999rem",

        ".tooltip": {
          "--tooltip-tail": "6px",
          "--tooltip-color": "oklch(var(--p))",
        },
        ".link": {
          textUnderlineOffset: "2px",
        },
        ".link:hover": {
          opacity: "80%",
        },
        ".contract-content": {
          background: "#0A0A0A",
        },
      },
    },
  ],

  theme: {
    extend: {
      boxShadow: {
        center: "0 0 12px -2px rgb(0 0 0 / 0.05)",
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      backgroundImage: {
        "gradient-light":
          "linear-gradient(270deg, #F7931A -17.42%, #000000 109.05%)",
        "gradient-dark": "linear-gradient(90deg, #F7931A 0%, #000000 100%)",
        "gradient-vertical":
          "linear-gradient(180deg, #F7931A 0%, #D97706 100%)",
        "gradient-icon": "linear-gradient(90deg, #F7931A 0%, #000000 100%)",
      },
    },
  },
};
