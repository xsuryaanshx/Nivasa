import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

// Apply native class for Android-specific styling
if (Capacitor.isNativePlatform()) {
  document.body.classList.add("is-native");
}

createRoot(document.getElementById("root")!).render(<App />);
