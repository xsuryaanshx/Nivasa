import { createRoot } from "react-dom/client";
console.log("BUILD VERSION:", "2026-05-06-08-20"); // Updated for verification
import App from "./App.tsx";
import "./index.css";
import { nivasaApi } from "./lib/api.ts";

// Register the API facade globally so every page can access it.
window.nivasaApi = nivasaApi;

createRoot(document.getElementById("root")!).render(<App />);
