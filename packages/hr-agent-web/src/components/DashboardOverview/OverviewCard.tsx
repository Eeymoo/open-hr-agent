import { Card, Skeleton } from 'antd';
import type { ReactNode } from 'react';
import './OverviewCard.css';

interface OverviewCardProps {
  title: string;
  icon: ReactNode;
  loading?: boolean;
  children: ReactNode;
  onClick?: () => void;
}

export function OverviewCard({ title, icon, loading, children, onClick }: OverviewCardProps) {
  return (
    <Card className="overview-card" hoverable={!!onClick} onClick={onClick}>
      <div className="overview-card-header">
        <div className="overview-card-icon">{icon}</div>
        <h3 className="overview-card-title">{title}</h3>
      </div>
      <div className="overview-card-content">
        {loading ? <Skeleton active paragraph={{ rows: 2 }} /> : children}
      </div>
    </Card>
  );
}
