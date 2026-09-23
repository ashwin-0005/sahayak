/** @type {import('tailwindcss').Config} */
import { colorToken, fontSizeToken, radius, shadow, spacing } from "./src/theme/tokens";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ...colorToken
      },
      fontFamily: {
        mukta: ["Mukta", "system-ui", "sans-serif"]
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