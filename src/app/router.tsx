import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/app/app-layout";
import { ProtectedRoute } from "@/components/app/protected-route";
import { RouteErrorPage } from "@/components/app/route-error-page";
import { LoginPage } from "@/features/auth/login-page";
import { ProfilePage } from "@/features/auth/profile-page";
import { UserAdminPage } from "@/features/auth/user-admin-page";
import { MastersPage } from "@/features/masters/masters-page";
import { ReportDetailPage } from "@/features/reports/report-detail-page";
import { ReportFormPage } from "@/features/reports/report-form-page";
import { ReportsPage } from "@/features/reports/reports-page";
import { SitesPage } from "@/features/sites/sites-page";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AppLayout />,
        errorElement: <RouteErrorPage />,
        children: [
          { path: "/", element: <Navigate to="/reports" replace /> },
          { path: "/reports", element: <ReportsPage /> },
          { path: "/reports/new", element: <ReportFormPage /> },
          { path: "/reports/:id", element: <ReportDetailPage /> },
          { path: "/sites", element: <SitesPage /> },
          { path: "/settings/profile", element: <ProfilePage /> },
          { path: "/settings/users", element: <UserAdminPage /> },
          { path: "/masters/:type", element: <MastersPage /> },
        ],
      },
    ],
  },
]);
