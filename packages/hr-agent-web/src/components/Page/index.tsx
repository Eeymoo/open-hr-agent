import type { ReactNode } from 'react';
import { Spin } from 'antd';

interface PageProps {
  children: ReactNode;
  loading?: boolean;
  className?: string;
}

export function Page({ children, loading, className }: PageProps) {
  if (loading) {
    return (
      <div className={className} style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Spin size="large" tip="加载中..." />
        </div>
      </div>
    );
  }

  return <div className={className} style={{ padding: 24 }}>{children}</div>;
}
