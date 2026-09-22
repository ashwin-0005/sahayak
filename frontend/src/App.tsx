import { Suspense, lazy, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { getSession, isLocked } from "./auth/auth";
import { initSyncEngine } from "./sync/syncEngine";
import { getHealth } from "./lib/api";
import { withRetry } from "./lib/retry";
import { WakeNotice } from "./components/WakeNotice";
import LoginPage from "./pages/Login";
import LandingPage from "./pages/Landing";
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

// Background cold-start probe: pings /api/health once at launch (3 attempts).
// Cached Dexie data renders immediately regardless; this only drives a
// non-blocking banner while a sleeping server wakes up.
function ServerWakeBanner() {
  const { pathname } = useLocation();
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const slowId = setTimeout(() => {
      if (!cancelled) setWaking(true);
    }, 2000);
    void (async () => {
      try {
        await withRetry(() => getHealth(), { attempts: 3 });
      } catch {
        // Offline or unreachable — the app keeps working from cache.
      } finally {
        if (!cancelled) {
          clearTimeout(slowId);
          setWaking(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(slowId);
    };
  }, []);

  if (pathname === "/login" || !waking) return null;
  return (
    <div className="mx-auto w-full max-w-[480px] px-4 pt-4">
      <WakeNotice />
    </div>
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
    <>
      <ServerWakeBanner />
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/home"
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
    </>
  );
}