/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      // DiveDrop Premium Color Palette
      colors: {
        // Primary - Ocean Blue (Diving Theme)
        "ocean-blue": "#0066CC",
        "ocean-blue-dark": "#003D8C",
        "ocean-blue-light": "#1A5FBD",

        // Accent - Cyan/Turquoise
        "cyan-accent": "#00BCD4",
        "aqua": "#48D1E0",

        // Backgrounds
        "dark-bg": "#0A1428",
        "dark-surface": "#1A2332",
        "dark-surface-elevated": "#2A3340",
        "light-bg": "#FFFFFF",
        "light-surface": "#F8FAFC",

        // Status - Difficulty Levels
        "success-easy": "#00C853",
        "warning-intermediate": "#FFC400",
        "error-hard": "#FF3D00",
        "info": "#00B4D8",

        // Neutral
        "text-dark": "#0A1428",
        "text-light": "#E8EEF5",
        "text-secondary-dark": "#5A6370",
        "text-secondary-light": "#A8B0BC",
        "disabled": "#80878F",
        "border-light": "#D0D5DB",
        "border-dark": "#2A3340",

        // Semantic surface and text tokens. Prefixes prevent collisions with
        // the primary brand color in Tailwind v4.
        "bg-primary": "var(--bg-primary, #FFFFFF)",
        "bg-secondary": "var(--bg-secondary, #F8FAFC)",
        "bg-tertiary": "var(--bg-tertiary, #E8EEF5)",
        "text-primary": "var(--text-primary, #0A1428)",
        "text-secondary": "var(--text-secondary, #5A6370)",
        "text-tertiary": "var(--text-tertiary, #80878F)",
        "border-primary": "var(--border-primary, #D0D5DB)",
        "border-secondary": "var(--border-secondary, #E0E4E8)",
        success: "var(--color-success, #00C853)",
        warning: "var(--color-warning, #FFC400)",
        error: "var(--color-error, #FF3D00)",

        // Primary brand colors - using CSS variables from design-system.css
        primary: "var(--color-primary, #0066CC)",
        "primary-dark": "var(--color-primary-dark, #003D8C)",
        "primary-light": "var(--color-primary-light, #1A5FBD)",
        accent: "var(--color-accent, #00BCD4)",
        "accent-light": "var(--color-accent-light, #48D1E0)",
      },

      // Border Radius - using CSS variables
      borderRadius: {
        "sharp": "0px",
        "sm": "var(--radius-sm, 6px)",
        "md": "var(--radius-md, 12px)",
        "lg": "var(--radius-lg, 16px)",
        "full": "var(--radius-full, 9999px)",
      },

      // Shadows (Elevation System)
      boxShadow: {
        "elevation-1": "0 2px 4px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)",
        "elevation-2": "0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)",
        "elevation-3": "0 8px 24px rgba(0, 0, 0, 0.16), 0 4px 8px rgba(0, 0, 0, 0.1)",
        "elevation-4": "0 16px 40px rgba(0, 0, 0, 0.2), 0 8px 16px rgba(0, 0, 0, 0.12)",
        "inner-glow": "inset 0 1px 3px rgba(0, 102, 204, 0.1)",
      },

      // Typography
      fontSize: {
        "h1": ["48px", { lineHeight: "56px", fontWeight: "700" }],
        "h2": ["36px", { lineHeight: "44px", fontWeight: "700" }],
        "h3": ["28px", { lineHeight: "36px", fontWeight: "600" }],
        "h4": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "caption": ["11px", { lineHeight: "14px", fontWeight: "400" }],
      },

      // Font Family
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "system-ui", "sans-serif"],
        heading: ["Poppins", "Inter", "system-ui", "sans-serif"],
      },

      fontWeight: {
        regular: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },

      // Transitions & Animations
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "300ms",
      },

      transitionTimingFunction: {
        "ease-out": "cubic-bezier(0.4, 0, 0.2, 1)",
        "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },

      animation: {
        "spin-slow": "spin 1s linear infinite",
        "pulse": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 1.5s infinite",
        "bounce-in": "bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "shake": "shake 0.4s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.2s ease-in",
        "fade-in": "fadeIn 0.3s ease-out",
        "scale-in": "scaleIn 0.25s ease-out",
      },

      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-3px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(3px)" },
        },
        slideUp: {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          from: { transform: "translateY(-10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scaleIn: {
          from: { transform: "scale(0.9)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        bounceIn: {
          "0%": { transform: "scale(0)" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)" },
        },
      },

      // Safe Area (iOS)
      inset: {
        "safe-top": "var(--safe-area-inset-top, 0)",
        "safe-bottom": "var(--safe-area-inset-bottom, 0)",
      },

      // Opacity
      opacity: {
        disabled: "0.5",
      },

      // Min Height for Touch Targets
      minHeight: {
        touch: "44px",
        "touch-lg": "48px",
      },

      minWidth: {
        touch: "44px",
        "touch-lg": "48px",
      },

      // Glass Morphism
      backdropBlur: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
      },

      // Gradient backgrounds
      backgroundImage: {
        "ocean-gradient": "linear-gradient(135deg, #0066CC 0%, #003D8C 50%, #001F4D 100%)",
        "ocean-light": "linear-gradient(to bottom, rgba(0, 102, 204, 0.1), transparent)",
        "shimmer": "linear-gradient(90deg, #1A2332 0%, #2A3340 50%, #1A2332 100%)",
      },

      // Aspect Ratio (for images, cards)
      aspectRatio: {
        "square": "1 / 1",
        "video": "16 / 9",
        "portrait": "9 / 16",
        "landscape": "16 / 10",
      },

      // Z-index scale
      zIndex: {
        hide: "-1",
        base: "0",
        dropdown: "1000",
        sticky: "1020",
        modal: "1050",
        popover: "1060",
        tooltip: "1070",
      },
    },
  },

  plugins: [],

  // Dark mode toggle strategy
  darkMode: "class",

  // Responsiveness
  screens: {
    "xs": "320px",
    "sm": "640px",
    "md": "1024px",
    "lg": "1280px",
    "xl": "1536px",
  },
};
