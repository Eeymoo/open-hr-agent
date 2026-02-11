import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Login } from '../pages/Login';
import { TaskOrchestration } from '../pages/TaskOrchestration';
import { AppLayout } from '../components/Layout';
import { AuthGuard } from '../components/AuthGuard';

function ProtectedLayout() {
  return (
    <AuthGuard>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </AuthGuard>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/orchestration" replace />
      },
      {
        path: 'orchestration',
        element: <TaskOrchestration />
      }
    ]
  }
]);
