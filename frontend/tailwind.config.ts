import type { Config } from "tailwindcss";

const SANS = [
  "var(--font-jakarta)",
  "Plus Jakarta Sans",
  "Noto Sans Myanmar",
  "Pyidaungsu",
  "system-ui",
  "sans-serif",
];

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ---- Legacy ZayWear tokens (kept for existing screens) ----
        soot: "#1F1F1F",
        terracotta: "#B85D43",
        taupe: "#8C7A6B",
        canvas: "#FAF9F6",
        raised: "#F5F3EF",
        hairline: "#E6E2D8",

        // ---- Material 3 tokens (from the Stitch design system) ----
        primary: "#060607",
        "primary-container": "#1f1f1f",
        "on-primary": "#ffffff",
        "on-primary-container": "#888686",
        "primary-fixed": "#e5e2e1",
        "primary-fixed-dim": "#c8c6c5",
        "on-primary-fixed": "#1b1b1c",
        "on-primary-fixed-variant": "#474746",
        "inverse-primary": "#c8c6c5",

        secondary: "#99452d",
        "secondary-container": "#fe9476",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#762b15",
        "secondary-fixed": "#ffdbd1",
        "secondary-fixed-dim": "#ffb5a0",
        "on-secondary-fixed": "#3b0900",
        "on-secondary-fixed-variant": "#7a2f18",

        tertiary: "#0e0601",
        "tertiary-container": "#291d12",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#968474",
        "tertiary-fixed": "#f5decd",
        "tertiary-fixed-dim": "#d8c3b2",
        "on-tertiary-fixed": "#25190f",
        "on-tertiary-fixed-variant": "#534437",

        error: "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",

        background: "#faf9f6",
        "on-background": "#1a1c1a",
        surface: "#faf9f6",
        "surface-dim": "#dbdad7",
        "surface-bright": "#faf9f6",
        "surface-variant": "#e3e2e0",
        "on-surface": "#1a1c1a",
        "on-surface-variant": "#444748",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f4f3f1",
        "surface-container": "#efeeeb",
        "surface-container-high": "#e9e8e5",
        "surface-container-highest": "#e3e2e0",
        "surface-tint": "#5f5e5e",
        "inverse-surface": "#2f312f",
        "inverse-on-surface": "#f2f1ee",
        outline: "#747878",
        "outline-variant": "#c4c7c7",
      },
      fontFamily: {
        sans: SANS,
        "display-hero": SANS,
        "display-hero-mobile": SANS,
        "headline-lg": SANS,
        "headline-lg-mobile": SANS,
        "headline-md": SANS,
        "headline-sm": SANS,
        "body-lg": SANS,
        "body-md": SANS,
        "body-sm": SANS,
        "label-md": SANS,
        "label-sm": SANS,
      },
      fontSize: {
        "display-hero": [
          "56px",
          { lineHeight: "64px", letterSpacing: "-0.03em", fontWeight: "400" },
        ],
        "display-hero-mobile": [
          "36px",
          { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "400" },
        ],
        "headline-lg": [
          "36px",
          { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "400" },
        ],
        "headline-lg-mobile": [
          "28px",
          { lineHeight: "36px", letterSpacing: "-0.01em", fontWeight: "500" },
        ],
        "headline-md": [
          "24px",
          { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "500" },
        ],
        "headline-sm": [
          "20px",
          { lineHeight: "28px", letterSpacing: "0em", fontWeight: "500" },
        ],
        "body-lg": [
          "17px",
          { lineHeight: "28px", letterSpacing: "0em", fontWeight: "400" },
        ],
        "body-md": [
          "15px",
          { lineHeight: "24px", letterSpacing: "0.01em", fontWeight: "400" },
        ],
        "body-sm": [
          "13px",
          { lineHeight: "20px", letterSpacing: "0.01em", fontWeight: "400" },
        ],
        "label-md": [
          "12px",
          { lineHeight: "16px", letterSpacing: "0.08em", fontWeight: "600" },
        ],
        "label-sm": [
          "10px",
          { lineHeight: "14px", letterSpacing: "0.1em", fontWeight: "600" },
        ],
      },
      spacing: {
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2.5rem",
        margin: "4rem",
        "margin-mobile": "1.25rem",
        gutter: "1.5rem",
        "gutter-mobile": "0.75rem",
      },
      borderRadius: {
        DEFAULT: "2px",
        lg: "4px",
        xl: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
