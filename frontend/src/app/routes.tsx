import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { WarehousesPage } from "./pages/WarehousesPage";
import { FoodsPage } from "./pages/FoodsPage";
import { LogsPage } from "./pages/LogsPage";
import { AreasPage } from "./pages/AreasPage";
import { WarehouseDetailPage } from "./pages/WarehouseDetailPage";
import { AreaDetailPage } from "./pages/AreaDetailPage";
import { DeviceDetailPage } from "./pages/DeviceDetailPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { AlertsPage } from "./pages/AlertsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { UsersPage } from "./pages/UsersPage";
import { ProfilePage } from "./pages/ProfilePage";
import { store } from "./store";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = store.getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = store.getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== "Admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <RootLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "warehouses",
        element: <WarehousesPage />,
      },
      {
        path: "foods",
        element: <FoodsPage />,
      },
      {
        path: "logs",
        element: <LogsPage />,
      },
      {
        path: "areas/:warehouseId",
        element: <AreasPage />,
      },
      {
        path: "warehouses/:warehouseId",
        element: <WarehouseDetailPage />,
      },
      {
        path: "warehouses/:warehouseId/areas/:areaId",
        element: <AreaDetailPage />,
      },
      {
        path: "warehouses/:warehouseId/areas/:areaId/devices/:deviceId",
        element: <DeviceDetailPage />,
      },
      {
        path: "schedules",
        element: <SchedulesPage />,
      },
      {
        path: "alerts",
        element: <AlertsPage />,
      },
      {
        path: "reports",
        element: <ReportsPage />,
      },
      {
        path: "users",
        element: (
          <AdminRoute>
            <UsersPage />
          </AdminRoute>
        ),
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);
