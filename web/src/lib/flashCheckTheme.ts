import type { Theme } from "@aws-amplify/ui-react";

/** Amplify Face Liveness theme aligned with TalkLov accent (pink → lavender). */
export const flashCheckTheme: Theme = {
  name: "talklov-flash-check",
  tokens: {
    colors: {
      background: {
        primary: { value: "#0c0d12" },
        secondary: { value: "#16171f" },
      },
      font: {
        primary: { value: "#f3eef5" },
        secondary: { value: "#9a94a8" },
        interactive: { value: "#e889b0" },
      },
      border: {
        primary: { value: "#2e3040" },
      },
      brand: {
        primary: {
          10: { value: "rgba(232, 137, 176, 0.12)" },
          20: { value: "rgba(232, 137, 176, 0.22)" },
          40: { value: "#e889b0" },
          60: { value: "#d9769c" },
          80: { value: "#c96a9a" },
          90: { value: "#b39af5" },
          100: { value: "#8f7de8" },
        },
      },
    },
    components: {
      button: {
        primary: {
          backgroundColor: { value: "{colors.brand.primary.80}" },
          color: { value: "#ffffff" },
          borderColor: { value: "transparent" },
          _hover: {
            backgroundColor: { value: "{colors.brand.primary.90}" },
            borderColor: { value: "transparent" },
          },
          _focus: {
            backgroundColor: { value: "{colors.brand.primary.90}" },
            borderColor: { value: "transparent" },
          },
          _active: {
            backgroundColor: { value: "{colors.brand.primary.100}" },
            borderColor: { value: "transparent" },
          },
        },
      },
    },
  },
};
