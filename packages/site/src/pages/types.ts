export interface SendRequest {
  (message: string, request: any): Promise<any>;
  (
    message: string,
    request: any,
    subscriber: (data: any) => void,
  ): Promise<any>;
}