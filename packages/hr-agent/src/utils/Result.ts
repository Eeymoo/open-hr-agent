/**
 * 标准化的 API 响应结果结构
 * @template T - 响应数据的类型
 */
interface ResultJSON<T = unknown> {
  /** 状态码 */
  code: number;
  /** 响应消息 */
  message: string;
  /** 响应数据 */
  data: T;
}

/**
 * 统一的 API 响应结果类
 * 用于封装所有 API 接口的返回数据，提供标准化的成功和错误响应格式
 * @template T - 响应数据的类型
 */
export default class Result<T = unknown> {
  /** HTTP 状态码 */
  code: number;
  /** 响应消息 */
  message: string;
  /** 响应数据 */
  data: T;

  /**
   * 创建 Result 实例
   * @param data - 响应数据，默认为 null
   * @param code - 状态码，默认为 200
   * @param message - 响应消息，默认为 'success'
   */
  constructor(data: T | null = null, code: number = 200, message: string = 'success') {
    this.code = code;
    this.message = message;
    this.data = data as T;
  }

  /**
   * 设置错误响应
   * @param code - 错误状态码
   * @param message - 错误消息
   * @param data - 可选的错误数据
   * @returns 当前 Result 实例，支持链式调用
   */
  error(code: number, message: string, data: T | null = null): this {
    this.code = code;
    this.message = message;
    this.data = data as T;
    return this;
  }

  /**
   * 设置成功响应
   * @param data - 响应数据
   * @param message - 成功消息，默认为 'success'
   * @returns 当前 Result 实例，支持链式调用
   */
  success(data: T, message: string = 'success'): this {
    this.code = 200;
    this.message = message;
    this.data = data;
    return this;
  }

  /**
   * 将 Result 转换为 JSON 对象
   * @returns JSON 格式的响应结果
   */
  toJSON(): ResultJSON<T> {
    return {
      code: this.code,
      message: this.message,
      data: this.data
    };
  }
}
