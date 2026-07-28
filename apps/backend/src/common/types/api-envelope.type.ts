export interface SuccessEnvelope<T> {
  success: boolean;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface ErrorEnvelope {
  success: boolean;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
    requestId: string;
    path: string;
  };
}
