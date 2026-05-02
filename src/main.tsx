import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { estateApi } from "./lib/api.ts";

// Register the API facade globally so every page can access it.
window.estateApi = estateApi;

createRoot(document.getElementById("root")!).render(<App />);
