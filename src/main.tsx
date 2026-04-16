import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { RuntimeRecovery } from "@/components/app/runtime-recovery";
import { AuthProvider } from "@/features/auth/auth-context";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <RuntimeRecovery />
    <RouterProvider router={router} />
    <Toaster richColors position="top-center" />
  </AuthProvider>,
);
