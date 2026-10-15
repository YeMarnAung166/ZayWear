import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        soot: "#1F1F1F",
        terracotta: "#B85D43",
        taupe: "#8C7A6B",
        canvas: "#FAF9F6",
        raised: "#F5F3EF",
        hairline: "#E6E2D8",
      },
      fontFamily: {
        sans: [
          "var(--font-jakarta)",
          "Noto Sans Myanmar",
          "Pyidaungsu",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        DEFAULT: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
