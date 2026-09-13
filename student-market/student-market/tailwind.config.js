/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1F2A24",        // near-black green-tinted text
        paper: "#F6F4EC",      // warm paper background
        line: "#D8D2C0",       // hairline rule
        forest: "#2F4B3C",     // primary brand
        forestDark: "#203528",
        brass: "#B08A3E",      // accent
        brassLight: "#E9DDBB",
        danger: "#9B3B2C",
      },
      fontFamily: {
        display: ["'Fraunces'", "Georgia", "serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "3px",
        md: "5px",
      },
    },
  },
  plugins: [],
};
