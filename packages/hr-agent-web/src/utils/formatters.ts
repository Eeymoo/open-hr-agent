import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export const formatTimestamp = (timestamp: number): string => {
  if (timestamp === -2) return '-';
  return dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm:ss');
};

export const formatRelativeTime = (timestamp: number): string => {
  if (timestamp === -2) return '-';
  return dayjs.unix(timestamp).fromNow();
};

export const formatDuration = (start: number, end: number): string => {
  if (start === -2 || end === -2) return '-';
  const diff = end - start;
  if (diff < 60) return `${diff}秒`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时`;
  return `${Math.floor(diff / 86400)}天`;
};

export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

export const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    planned: '已规划',
    queued: '排队中',
    running: '运行中',
    retrying: '重试中',
    in_development: '开发中',
    development_complete: '开发完成',
    pr_submitted: 'PR已提交',
    pr_merged: 'PR已合并',
    pr_comments_resolved: 'PR评论已解决',
    error: '错误',
    cancelled: '已取消',
    timeout: '超时'
  };
  return statusMap[status] || status;
};

export const formatPriority = (priority: number): string => {
  if (priority >= 80) return '高';
  if (priority >= 50) return '中';
  return '低';
};
