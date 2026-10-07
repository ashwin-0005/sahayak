/** @type {import('tailwindcss').Config} */
import { colorToken, fontSizeToken, radius, shadow, spacing } from "./src/theme/tokens";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ...colorToken,
        // Vantage-style dark canvas + raised panels. The app still renders on
        // the light token surfaces (cards, inputs), but every screen now sits
        // on a near-black, vignetted backdrop framed in glass.
        night: "#05070A",
        "night-raised": "#0B1117"
      },
      fontFamily: {
        mukta: ["Mukta", "system-ui", "sans-serif"],
        // The Vantage design calls for Reference Sans/Display variable fonts.
        // They are proprietary, so the stack prefers them and falls back to
        // the bundled Mukta (which also carries Devanagari for Hindi UI).
        sans: ["Reference Sans", "Mukta", "system-ui", "Segoe UI", "sans-serif"],
        display: ["Reference Display", "Reference Sans", "Mukta", "system-ui", "Segoe UI", "sans-serif"]
      },
      fontSize: {
        ...fontSizeToken
      },
      borderRadius: {
        ...radius
      },
      spacing: {
        ...spacing
      },
      boxShadow: {
        ...shadow
      }
    }
  },
  plugins: []
};