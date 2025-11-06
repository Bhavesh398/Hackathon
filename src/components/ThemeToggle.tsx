import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="rounded-full h-12 w-12 shadow-lg hover:shadow-xl transition-all bg-card border-2 border-primary/20 hover:border-primary/40"
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5 text-primary" />
        ) : (
          <Moon className="h-5 w-5 text-primary" />
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  );
};

export default ThemeToggle;
