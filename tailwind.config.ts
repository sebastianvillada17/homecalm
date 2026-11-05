import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#20342E",
        muted: "#728078",
        forest: "#176B5B",
        "forest-dark": "#104D43",
        mint: "#E8F3EE",
        canvas: "#F5F6F2",
        paper: "#FFFFFF",
        line: "#E7EBE5",
        sun: "#EFAE53",
        sky: "#7EA8D3",
        rose: "#D66D61",
      },
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 8px 24px rgba(23, 47, 39, 0.045)",
        float: "0 18px 42px rgba(23, 47, 39, 0.13)",
      },
      borderRadius: {
        card: "1.35rem",
      },
    },
  },
  plugins: [],
};

export default config;
