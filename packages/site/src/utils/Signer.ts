// Copyright 2019-2021 @polkadot/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type {
  Signer as SignerInterface,
  SignerResult,
} from '@polkadot/api/types';
import type {
  SignerPayloadJSON,
  SignerPayloadRaw,
} from '@polkadot/types/types';
import { InvokeSnapFn } from 'src/hooks';

export default class Signer implements SignerInterface {

  private invokeSnap: InvokeSnapFn;

  constructor(_invokeSnap: InvokeSnapFn) {
    this.invokeSnap = _invokeSnap;
  }

  public async signPayload(payload: SignerPayloadJSON): Promise<SignerResult> {
    const result = await this.invokeSnap({ 
      method: 'requestSignature',
      params: { ...payload } 
    });

    if (!result) return Promise.reject(new Error('_canceled'));
    return { ...result };
  }

  public async signRaw(payload: SignerPayloadRaw): Promise<SignerResult> {
    const result = await this.invokeSnap({ 
      method: 'requestSignature',
      params: { ...payload } 
    });

    if (!result) return Promise.reject(new Error('_canceled'));
    return { ...result };
  }
}
