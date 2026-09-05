import { supabase } from "@/lib/supabase";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import hexToHsl from "@/lib/hextohsl";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("light");
  const [fontSize, setFontSize] = useState("medium");
  const [primaryColor, setPrimaryColor] = useState("#07AC7D");
  const [accentColor, setAccentColor] = useState("#F59E0B");

  const {user} = useAuth();

  // Load from localStorage on app start
  useEffect(() => {
    setTheme(localStorage.getItem("app-theme") || "light");
    setFontSize(localStorage.getItem("app-fontSize") || "medium");
    setPrimaryColor(localStorage.getItem("app-primary") || "#07AC7D");
    setAccentColor(localStorage.getItem("app-accent") || "#F59E0B");
    localStorage.removeItem("app-contrast");
  }, []);

  // Apply theme + save whenever changed
  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(theme);

    root.classList.remove(
      "text-small",
      "text-medium",
      "text-large",
      "text-xlarge",
    );
    root.classList.add(`text-${fontSize}`);

    root.classList.remove("contrast-normal", "contrast-high");

    root.style.setProperty("--primary", hexToHsl(primaryColor));
    root.style.setProperty("--accent", hexToHsl(accentColor));

    localStorage.setItem("app-theme", theme);
    localStorage.setItem("app-fontSize", fontSize);
    localStorage.setItem("app-primary", primaryColor);
    localStorage.setItem("app-accent", accentColor);
  }, [theme, fontSize, primaryColor, accentColor]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        fontSize,
        setFontSize,
        primaryColor,
        setPrimaryColor,
        accentColor,
        setAccentColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

