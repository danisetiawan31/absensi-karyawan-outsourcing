/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/app/**/*.{js,jsx,ts,tsx}", "./src/screens/**/*.{js,jsx,ts,tsx}", "./src/components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#FAFAF8",
        surface: "#FFFFFF",
        primary: "#FFC81E",
        "primary-hover": "#E5B41A", // slightly darker for hover/active state
        "on-primary": "#1E1B16",
        foreground: "#1E1B16",
        muted: "#64748B",
        border: "#E4E4DF",
        success: "#16A34A",
        "success-bg": "#DCFCE7",
        "success-text": "#166534",
        warning: "#EA580C",
        "warning-bg": "#FFEDD5",
        "warning-text": "#9A3412",
        info: "#2563EB",
        "info-bg": "#DBEAFE",
        "info-text": "#1E40AF",
        destructive: "#DC2626",
        "destructive-bg": "#FEE2E2",
        "destructive-text": "#991B1B",
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        full: "999px",
      },
      fontFamily: {
        sans: ["PlusJakartaSans-Regular", "sans-serif"],
        "sans-semibold": ["PlusJakartaSans-SemiBold", "sans-serif"],
        "sans-bold": ["PlusJakartaSans-Bold", "sans-serif"],
        "sans-extrabold": ["PlusJakartaSans-ExtraBold", "sans-serif"],
      },
    },
  },
  plugins: [],
  presets: [require("nativewind/preset")],
}
