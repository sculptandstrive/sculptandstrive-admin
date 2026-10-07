/**
 * Cross-App URL resolver for Sculpt & Strive ecosystem:
 * - Landing / Marketing Website: http://localhost:5173 -> https://sculptandstrive.com
 * - User / Client Dashboard App: http://localhost:8081 -> https://users.sculptandstrive.com
 * - Admin / Coach Portal: http://localhost:8080 -> https://admin.sculptandstrive.com
 * 
 * Works seamlessly on localhost during local development and automatically
 * falls back to the production domains in staging/production environments.
 */

export const isLocalEnvironment = (): boolean => {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
};

export const getLandingPageUrl = (): string => {
  if (import.meta.env.VITE_LANDING_URL) {
    return import.meta.env.VITE_LANDING_URL;
  }
  if (isLocalEnvironment()) {
    return "http://localhost:5173";
  }
  return "https://sculptandstrive.com";
};

export const getUserAppUrl = (): string => {
  if (import.meta.env.VITE_USER_APP_URL) {
    return import.meta.env.VITE_USER_APP_URL;
  }
  if (isLocalEnvironment()) {
    return "http://localhost:8081";
  }
  return "https://users.sculptandstrive.com";
};

export const getAdminAppUrl = (): string => {
  if (import.meta.env.VITE_ADMIN_URL) {
    return import.meta.env.VITE_ADMIN_URL;
  }
  if (isLocalEnvironment()) {
    return "http://localhost:8080";
  }
  return "https://admin.sculptandstrive.com";
};
