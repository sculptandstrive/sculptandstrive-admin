/*import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);*/

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Filter out noisy DevTools / extension / web-vitals / framer-motion warning edge cases
const isIgnoredMessage = (msg?: string) => {
  if (!msg || typeof msg !== "string") return false;
  return (
    msg.includes("Cannot read properties of undefined (reading 'startTime')") ||
    msg.includes("reportAllChanges") ||
    msg.includes("requestIdleCallback") ||
    msg.includes("was preloaded using link preload but not used") ||
    msg.includes("You're attempting to animate multiple children within AnimatePresence")
  );
};

const origWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = args.map((a) => (typeof a === "string" ? a : (a?.message || ""))).join(" ");
  if (isIgnoredMessage(msg)) return;
  origWarn.apply(console, args);
};

const origError = console.error;
console.error = (...args: any[]) => {
  const msg = args.map((a) => (typeof a === "string" ? a : (a?.message || ""))).join(" ");
  if (isIgnoredMessage(msg)) return;
  origError.apply(console, args);
};

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
    <App />
  </GoogleOAuthProvider>
);
