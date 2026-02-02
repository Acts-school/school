import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        lamaSky: "#B3C9D6",
        lamaSkyLight: "#F2EFE2",
        lamaPurple: "#2D3536",
        lamaPurpleLight: "#98AA9D",
        lamaYellow: "#697C70",
        lamaYellowLight: "#F2EFE2",
      },
    },
  },
  plugins: [],
};
export default config;
