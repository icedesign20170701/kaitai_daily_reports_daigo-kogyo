import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/app/app-layout";
import { ProtectedRoute } from "@/components/app/protected-route";
import { LoginPage } from "@/features/auth/login-page";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Navigate to="/reports" replace /> },
          {
            path: "/reports",
            lazy: async () => {
              const { ReportsPage } = await import("@/features/reports/reports-page");
              return { Component: ReportsPage };
            },
          },
          {
            path: "/reports/new",
            lazy: async () => {
              const { ReportFormPage } = await import("@/features/reports/report-form-page");
              return { Component: ReportFormPage };
            },
          },
          {
            path: "/reports/:id",
            lazy: async () => {
              const { ReportDetailPage } = await import("@/features/reports/report-detail-page");
              return { Component: ReportDetailPage };
            },
          },
          {
            path: "/sites",
            lazy: async () => {
              const { SitesPage } = await import("@/features/sites/sites-page");
              return { Component: SitesPage };
            },
          },
          {
            path: "/settings/profile",
            lazy: async () => {
              const { ProfilePage } = await import("@/features/auth/profile-page");
              return { Component: ProfilePage };
            },
          },
          {
            path: "/settings/users",
            lazy: async () => {
              const { UserAdminPage } = await import("@/features/auth/user-admin-page");
              return { Component: UserAdminPage };
            },
          },
          {
            path: "/masters/:type",
            lazy: async () => {
              const { MastersPage } = await import("@/features/masters/masters-page");
              return { Component: MastersPage };
            },
          },
        ],
      },
    ],
  },
]);
