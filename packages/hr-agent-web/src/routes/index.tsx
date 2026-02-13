import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Login } from '../pages/Login';
import { TaskOrchestration } from '../pages/TaskOrchestration';
import { TaskList } from '../pages/TaskList';
import { IssuesList } from '../pages/Issues';
import { IssueDetail } from '../pages/IssueDetail';
import { PRsList } from '../pages/Prs';
import { PRDetail } from '../pages/PrDetail';
import { CAsList } from '../pages/Cas';
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
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: <TaskOrchestration />
      },
      {
        path: 'tasks',
        element: <TaskList />
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
      },
      {
        path: 'cas',
        element: <CAsList />
      }
    ]
  }
]);
