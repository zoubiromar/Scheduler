import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { AuthPage } from "./routes/AuthPage";
import { InvitePage } from "./routes/InvitePage";
import { LandingPage } from "./routes/LandingPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";

export default function RootApp() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
