import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Login } from '../pages/Login';
import { TaskOrchestration } from '../pages/TaskOrchestration';
import { IssuesList } from '../pages/Issues';
import { IssueDetail } from '../pages/IssueDetail';
import { PRsList } from '../pages/PRs';
import { PRDetail } from '../pages/PRDetail';
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
      },
      {
        path: 'issues',
        element: <IssuesList />
      },
      {
        path: 'issues/:id',
        element: <IssueDetail />
      },
      {
        path: 'prs',
        element: <PRsList />
      },
      {
        path: 'prs/:id',
        element: <PRDetail />
      }
    ]
  }
]);
