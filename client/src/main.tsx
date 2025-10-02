import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { installGlobalAbortGuards } from "./lib/abort";

installGlobalAbortGuards();

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element not found");
}

createRoot(container).render(<App />);

if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/env-intel-sw.js")
      .catch((error) => console.warn("Failed to register env intel service worker", error));
  });
}
