/** @type {import('tailwindcss').Config} */
import { colorToken, fontSizeToken, radius, shadow } from "./src/theme/tokens";

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
        "4.5": "18px"
      },
      boxShadow: {
        ...shadow
      }
    }
  },
  plugins: []
};