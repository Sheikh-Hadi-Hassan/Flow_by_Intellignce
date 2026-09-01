import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#f8f9fb" },
        { name: "dark", value: "#0f1117" },
      ],
    },
  },
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Flow theme mode",
      defaultValue: "light",
      toolbar: {
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
          { value: "accent", title: "Custom accent" },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme ?? "light";
      document.documentElement.dataset.theme = theme;
      if (theme === "accent") {
        document.documentElement.style.setProperty("--flow-accent", "#7c3aed");
      }
      return <Story />;
    },
  ],
};

export default preview;
