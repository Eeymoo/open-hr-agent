import { Button } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useTheme } from '../../hooks/useTheme';
import './index.css';

export function ThemeSwitcher() {
  const { themeName, toggleTheme } = useTheme();

  return (
    <Button
      type="text"
      icon={themeName === 'dark' ? <SunOutlined /> : <MoonOutlined />}
      onClick={toggleTheme}
      className="theme-switcher"
      title={themeName === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
    />
  );
}
