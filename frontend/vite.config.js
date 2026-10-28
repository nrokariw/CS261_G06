import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, "..", "");
  const backendPort = rootEnv.BACKEND_PORT || "8080";
  const backendTarget = `http://localhost:${backendPort}`;
  const apiBasePath = rootEnv.API_BASE_PATH || "/api";

  return {
    plugins: [react()],
    envDir: "..",
    define: {
      "import.meta.env.VITE_API_BASE_PATH": JSON.stringify(
        rootEnv.VITE_API_BASE_PATH || rootEnv.API_BASE_PATH || "/api",
      ),
      "import.meta.env.VITE_API_AUTH_PATH": JSON.stringify(
        rootEnv.VITE_API_AUTH_PATH || rootEnv.API_AUTH_PATH || "/api/auth",
      ),
      "import.meta.env.VITE_API_ITEMS_PATH": JSON.stringify(
        rootEnv.VITE_API_ITEMS_PATH || rootEnv.API_ITEMS_PATH || "/api/items",
      ),
      "import.meta.env.VITE_API_REQUESTS_PATH": JSON.stringify(
        rootEnv.VITE_API_REQUESTS_PATH || rootEnv.API_REQUESTS_PATH || "/api/requests",
      ),
      "import.meta.env.VITE_API_USERS_PATH": JSON.stringify(
        rootEnv.VITE_API_USERS_PATH || rootEnv.API_USERS_PATH || "/api/users",
      ),
      "import.meta.env.VITE_API_TRANSACTIONS_PATH": JSON.stringify(
        rootEnv.VITE_API_TRANSACTIONS_PATH ||
          rootEnv.API_TRANSACTIONS_PATH ||
          "/api/transactions",
      ),
      "import.meta.env.VITE_API_EVIDENCE_PATH": JSON.stringify(
        rootEnv.VITE_API_EVIDENCE_PATH ||
          rootEnv.API_EVIDENCE_PATH ||
          "/api/evidence",
      ),
    },
    server: {
      port: Number(rootEnv.FRONTEND_PORT || 3000),
      proxy: {
        [apiBasePath]: {
          target: backendTarget,
          changeOrigin: true,
        },
        "/uploads": {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
