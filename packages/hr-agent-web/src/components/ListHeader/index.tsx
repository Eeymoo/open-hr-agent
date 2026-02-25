import type { ReactNode } from 'react';
import { Button, Input, Space, Typography } from 'antd';
import type { SearchProps } from 'antd/es/input/Search';

const { Title } = Typography;

interface ListHeaderProps {
  title: string;
  count: number;
  countLabel: string;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearch: SearchProps['onSearch'];
  actionButton?: {
    icon?: ReactNode;
    text: string;
    onClick: () => void;
  };
}

export function ListHeader({
  title,
  count,
  countLabel,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onSearch,
  actionButton
}: ListHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Title level={2} style={{ margin: 0 }}>
          {title}
        </Title>
        <span style={{ color: '#8c8c8c' }}>
          共 {count} {countLabel}
        </span>
      </div>
      <Space>
        <Input.Search
          placeholder={searchPlaceholder}
          allowClear
          style={{ width: 300 }}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onSearch={onSearch}
        />
        {actionButton && (
          <Button type="primary" icon={actionButton.icon} onClick={actionButton.onClick}>
            {actionButton.text}
          </Button>
        )}
      </Space>
    </div>
  );
}
