// Client-only entry for the Android (Capacitor) build. No SSR, no router, no service worker:
// files are bundled inside the APK, so the app works offline by default.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles.css";
import { Calculator } from "../src/components/Calculator";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Calculator />
  </StrictMode>,
);