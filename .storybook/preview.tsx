import type { Decorator, Preview } from "@storybook/react-vite";

import { ThemeProvider } from "../src/theme/ThemeProvider";
import type { ThemePreference } from "../src/theme/theme";

import "../src/styles/global.css";

/** Wrap every story in the theme provider, keyed to the toolbar so switching remounts cleanly. */
const withTheme: Decorator = (Story, context) => {
  const theme = (context.globals.theme as ThemePreference | undefined) ?? "light";
  return (
    <ThemeProvider key={theme} initial={theme}>
      <div style={{ padding: "1.5rem", background: "var(--color-bg)", minHeight: "100vh" }}>
        <Story />
      </div>
    </ThemeProvider>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: "error" },
  },
  globalTypes: {
    theme: {
      description: "Color theme",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
          { value: "system", title: "System" },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
