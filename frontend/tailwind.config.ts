/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F8F4",
        ink: "#10231C",
        neem: "#1D6A50",
        "neem-dark": "#0F4433",
        mist: "#DDE9E2",
        urgent: "#C62828",
        clinic: "#B45309",
        home: "#2E7D32"
      },
      fontFamily: {
        mukta: ["Mukta", "system-ui", "sans-serif"]
      },
      fontSize: {
        body: ["17px", { lineHeight: "1.5" }],
        section: ["22px", { lineHeight: "1.3" }],
        page: ["30px", { lineHeight: "1.2" }],
        big: ["44px", { lineHeight: "1.1" }]
      },
      borderRadius: {
        card: "10px",
        button: "14px"
      },
      spacing: {
        "4.5": "18px"
      },
      boxShadow: {
        sheet: "0 -8px 30px rgba(16,35,28,0.18)"
      }
    }
  },
  plugins: []
};