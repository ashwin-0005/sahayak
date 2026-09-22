import { Suspense, lazy, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { getSession, isLocked } from "./auth/auth";
import { initSyncEngine } from "./sync/syncEngine";
import LoginPage from "./pages/Login";
import HomePage from "./pages/Home";
import PatientsPage from "./pages/Patients";
import PatientNewPage from "./pages/PatientNew";
// recharts is heavy and used on one screen only — lazy so it stays out of the main chunk.
const PatientDetailPage = lazy(() => import("./pages/PatientDetail"));
import VisitNewPage from "./pages/VisitNew";
import RiskResultPage from "./pages/RiskResult";
import ReminderPage from "./pages/Reminder";
import SettingsPage from "./pages/Settings";

function RouteFallback() {
  const { t } = useTranslation();
  return (
    <p role="status" className="mt-10 text-center text-body text-neem-dark">
      {t("common.loading")}
    </p>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    void (async () => {
      const session = await getSession();
      const locked = await isLocked();
      setAuthed(Boolean(session) && !locked);
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <RouteFallback />
      </div>
    );
  }
  if (!authed) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  useEffect(() => {
    void initSyncEngine();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/patients"
        element={
          <RequireAuth>
            <PatientsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/patients/new"
        element={
          <RequireAuth>
            <PatientNewPage />
          </RequireAuth>
        }
      />
      <Route
        path="/patients/:id"
        element={
          <RequireAuth>
            <Suspense fallback={<RouteFallback />}>
              <PatientDetailPage />
            </Suspense>
          </RequireAuth>
        }
      />
      <Route
        path="/visits/:patientId/new"
        element={
          <RequireAuth>
            <VisitNewPage />
          </RequireAuth>
        }
      />
      <Route
        path="/risk/result"
        element={
          <RequireAuth>
            <RiskResultPage />
          </RequireAuth>
        }
      />
      <Route
        path="/reminders/:patientId"
        element={
          <RequireAuth>
            <ReminderPage />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}