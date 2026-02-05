interface ResultJSON<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export default class Result<T = unknown> {
  code: number;
  message: string;
  data: T;

  constructor(data: T | null = null, code: number = 200, message: string = 'success') {
    this.code = code;
    this.message = message;
    this.data = data as T;
  }

  error(code: number, message: string, data: T | null = null): this {
    this.code = code;
    this.message = message;
    this.data = data as T;
    return this;
  }

  success(data: T, message: string = 'success'): this {
    this.code = 200;
    this.message = message;
    this.data = data;
    return this;
  }

  toJSON(): ResultJSON<T> {
    return {
      code: this.code,
      message: this.message,
      data: this.data
    };
  }
}
