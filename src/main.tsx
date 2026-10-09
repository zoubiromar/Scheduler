import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import RootApp from "./RootApp";
import "./index.css";
import { registerServiceWorker } from "./lib/registerServiceWorker";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);

registerServiceWorker();
