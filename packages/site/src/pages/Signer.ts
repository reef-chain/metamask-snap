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
import { sendToSnap } from '../utils';

export default class Signer implements SignerInterface {
  public async signPayload(payload: SignerPayloadJSON): Promise<SignerResult> {
    try {
      const approved = await sendToSnap('signatureRequest', payload);
      if (!approved) return Promise.reject(new Error('_canceled'));
      const result = await sendToSnap('approveSignExtrinsic', payload);
      return { ...result };
    } catch (e) {
      return Promise.reject(new Error('_canceled'));
    }
  }

  public async signRaw(payload: SignerPayloadRaw): Promise<SignerResult> {
    try {
      const approved = await sendToSnap('signatureRequest', payload);
      if (!approved) return Promise.reject(new Error('_canceled'));
      const result = await sendToSnap('approveSignBytes', payload);
      return { ...result };
    } catch (e) {
      return Promise.reject(new Error('_canceled'));
    }
  }
}
