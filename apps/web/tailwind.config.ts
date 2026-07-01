import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "../../packages/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        moss: "#2f5d50",
        copper: "#a85b36",
        cloud: "#f6f7f9"
      }
    }
  },
  plugins: []
};

export default config;
