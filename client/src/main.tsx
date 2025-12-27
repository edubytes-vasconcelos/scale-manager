import "./index.css";
import { registerServiceWorker, setupInstallPrompt } from "@/lib/pwa";

if (import.meta.env.PROD) {
  registerServiceWorker();
  setupInstallPrompt();
}

import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(<App />);
