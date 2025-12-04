import { ThemeProvider } from "@/context/ThemeContext";

export default function AdminLayout({ children }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}
