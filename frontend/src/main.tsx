import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { CertificateProvider } from "./context/CertificateContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CertificateProvider>
      <App />
    </CertificateProvider>
  </StrictMode>,
);
