import { defaultSnapOrigin } from '../config';
import { useRequest } from './useRequest';

export type InvokeSnapParams = {
  method: string;
  params?: Record<string, unknown>;
};

export interface InvokeSnapFn {
  (params: InvokeSnapParams): Promise<any>;
}

/**
 * Utility hook to wrap the `wallet_invokeSnap` method.
 *
 * @param snapId - The Snap ID to invoke. Defaults to the snap ID specified in the
 * config.
 * @returns The invokeSnap wrapper method.
 */
export const useInvokeSnap = (snapId = defaultSnapOrigin) => {
  const request = useRequest();

  /**
   * Invoke the requested Snap method.
   *
   * @param params - The invoke params.
   * @param params.method - The method name.
   * @param params.params - The method params.
   * @returns The Snap response.
   */
  const invokeSnap: InvokeSnapFn = async ({ method, params }: InvokeSnapParams): Promise<any> =>
    request({
      method: 'wallet_invokeSnap',
      params: {
        snapId,
        request: {
          method,
          params,
        },
      },
    });

  return invokeSnap;
};
