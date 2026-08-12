import { Languages, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export function LanguageToggle() {
  const { lang, toggleLang } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLang}
      aria-label="Switch language"
      className="gap-1.5 rounded-full px-3 font-semibold text-foreground"
    >
      <Languages className="size-4" />
      <span className="text-xs tracking-wide">{lang === "ar" ? "EN" : "عربي"}</span>
    </Button>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="relative rounded-full text-foreground"
    >
      <Sun className="size-4 rotate-0 scale-100 transition-transform duration-500 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-transform duration-500 dark:rotate-0 dark:scale-100" />
    </Button>
  );
}