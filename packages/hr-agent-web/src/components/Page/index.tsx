import type { ReactNode } from 'react';
import { Spin } from 'antd';
import './index.css';

interface PageProps {
  children: ReactNode;
  loading?: boolean;
  className?: string;
}

export function Page({ children, loading, className }: PageProps) {
  if (loading) {
    return (
      <div className={`page-container ${className || ''}`}>
        <div className="page-loading">
          <Spin size="large" tip="加载中..." />
        </div>
      </div>
    );
  }

  return <div className={`page-container ${className || ''}`}>{children}</div>;
}
