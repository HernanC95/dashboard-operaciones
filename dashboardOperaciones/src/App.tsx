import { useEffect, useState } from "react";
import DashboardPage from "./pages/Dashboard/DashboardPage";

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("dashboard-theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);

    localStorage.setItem("dashboard-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <DashboardPage darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />
  );
}
