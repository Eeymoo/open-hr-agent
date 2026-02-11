import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { getSecret } from '../utils/auth';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use(
  async (config) => {
    const secret = await getSecret();
    if (secret) {
      config.headers['X-Secret'] = secret;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('hra_secret');
      const errorMessage = error.response?.data?.message || '登录失败，请检查 SECRET 是否正确';
      sessionStorage.setItem('hra_last_error', errorMessage);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
