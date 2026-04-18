/** 서버가 내려주는 구조화된 에러 응답 */
export interface ServerErrorBody {
  code?: string;
  title?: string;
  description?: string;
  statusCode?: number;
  message?: string;
}
