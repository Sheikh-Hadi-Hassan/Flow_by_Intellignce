"use client";

import { Moon, Sun } from "lucide-react";

import { useClientHydrated } from "../../lib/prototype/hydration";
import { useTheme } from "../../lib/theme/context";
import { IconButton } from "../ui/Button";

export function ThemeControl() {
  const { theme, toggleTheme } = useTheme();
  const hydrated = useClientHydrated();
  const isDark = hydrated && theme === "dark";

  return (
    <IconButton
      label={
        !hydrated
          ? "Theme preference"
          : isDark
            ? "Switch to light mode"
            : "Switch to dark mode"
      }
      onClick={toggleTheme}
    >
      {!hydrated || !isDark ? <Sun size={18} /> : <Moon size={18} />}
    </IconButton>
  );
}
