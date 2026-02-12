import type { ReactNode } from 'react';
import { Button, Input, Space } from 'antd';
import type { SearchProps } from 'antd/es/input/Search';

import './index.css';

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
    <div className="list-header">
      <div className="header-left">
        <h2>{title}</h2>
        <span className="list-count">
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
