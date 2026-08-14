// Route table and access control.
//
// Routes are declared as data so the navigation, the guards and the sidebar all
// derive from one source. Adding a screen is one entry plus one component.

import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthContext";
import AppLayout from "@/app/AppLayout";
import { LoadingState } from "@/shared/components/LoadingState";

import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";
import LandingPage from "@/features/marketing/LandingPage";
import ScannerPage from "@/features/scanner/ScannerPage";
import ListingsPage from "@/features/listings/ListingsPage";
import ListingDetailPage from "@/features/listings/ListingDetailPage";
import CreateListingPage from "@/features/listings/CreateListingPage";
import MyListingsPage from "@/features/listings/MyListingsPage";
import BinReportPage from "@/features/bins/BinReportPage";
import BinMapPage from "@/features/bins/BinMapPage";
import ImpactPage from "@/features/impact/ImpactPage";
import CollectorPage from "@/features/collector/CollectorPage";
import MunicipalPage from "@/features/municipal/MunicipalPage";
import ProfilePage from "@/features/profile/ProfilePage";
import NotFoundPage from "@/shared/components/NotFoundPage";

/** Blocks a route until the session is known, then redirects if unauthenticated. */
function RequireAuth({ children }) {
  const { isAuthenticated, initialising } = useAuth();
  const location = useLocation();

  if (initialising) return <LoadingState label="Loading your session" />;

  if (!isAuthenticated) {
    // Remember where they were headed so login can return them there.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

/** Restricts a route to specific userTypes. */
function RequireRole({ allow, children }) {
  const { userType, initialising } = useAuth();
  if (initialising) return <LoadingState label="Loading" />;
  // Redirect rather than showing a refusal: a citizen has no use for a page they
  // cannot act on, and a dead end is worse than a sensible default.
  if (!allow.includes(userType)) return <Navigate to="/scan" replace />;
  return children;
}

/** Keeps signed-in users out of login/register. */
function RedirectIfAuthed({ children }) {
  const { isAuthenticated, initialising } = useAuth();
  if (initialising) return <LoadingState label="Loading" />;
  if (isAuthenticated) return <Navigate to="/scan" replace />;
  return children;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuthed>
            <RegisterPage />
          </RedirectIfAuthed>
        }
      />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/scan" element={<ScannerPage />} />
        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/listings/new" element={<CreateListingPage />} />
        <Route path="/listings/mine" element={<MyListingsPage />} />
        <Route path="/listings/:id" element={<ListingDetailPage />} />
        <Route path="/bins/report" element={<BinReportPage />} />
        <Route path="/bins/map" element={<BinMapPage />} />
        <Route
          path="/collect"
          element={
            <RequireRole allow={["collector", "admin"]}>
              <CollectorPage />
            </RequireRole>
          }
        />
        <Route
          path="/municipal"
          element={
            <RequireRole allow={["admin"]}>
              <MunicipalPage />
            </RequireRole>
          }
        />
        <Route path="/impact" element={<ImpactPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
