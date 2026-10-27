import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-9 h-9 rounded-full shrink-0 liquid-glass-pill text-foreground/80 hover:text-foreground"
      title="Toggle light/dark glass mode"
    >
      <Sun className="h-[1.05rem] w-[1.05rem] rotate-0 scale-100 transition-all text-amber-500 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.05rem] w-[1.05rem] rotate-90 scale-0 transition-all text-sky-300 dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
