import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export const TIMESTAMP_NEGATIVE_TWO = -2;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;
const PRIORITY_HIGH = 80;
const PRIORITY_MEDIUM = 50;

export const formatTimestamp = (timestamp: number): string => {
  if (timestamp === TIMESTAMP_NEGATIVE_TWO) {
    return '-';
  }
  return dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm:ss');
};

export const formatRelativeTime = (timestamp: number): string => {
  if (timestamp === TIMESTAMP_NEGATIVE_TWO) {
    return '-';
  }
  return dayjs.unix(timestamp).fromNow();
};

export const formatDuration = (start: number, end: number): string => {
  if (start === TIMESTAMP_NEGATIVE_TWO || end === TIMESTAMP_NEGATIVE_TWO) {
    return '-';
  }
  const diff = end - start;
  if (diff < SECONDS_PER_MINUTE) {
    return `${diff}秒`;
  }
  if (diff < SECONDS_PER_HOUR) {
    return `${Math.floor(diff / SECONDS_PER_MINUTE)}分钟`;
  }
  if (diff < SECONDS_PER_DAY) {
    return `${Math.floor(diff / SECONDS_PER_HOUR)}小时`;
  }
  return `${Math.floor(diff / SECONDS_PER_DAY)}天`;
};

export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) {
    return text;
  }
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
  if (priority >= PRIORITY_HIGH) {
    return '高';
  }
  if (priority >= PRIORITY_MEDIUM) {
    return '中';
  }
  return '低';
};
