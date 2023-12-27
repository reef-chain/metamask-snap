import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import type { HexString } from '@polkadot/util/types';
import { panel, text } from '@metamask/snaps-sdk';
import {
  accountsList,
  batchRestore,
  createAccountWithSeed,
  createSeed,
  providerUrl,
  signBytes,
  signExtrinsic,
} from './account';
import { SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types';
import { TypeRegistry } from '@polkadot/types';
import { KeyringPair } from '@polkadot/keyring/types';
import { RequestBatchRestore } from './types';

function isJsonPayload(
  value: SignerPayloadJSON | SignerPayloadRaw,
): value is SignerPayloadJSON {
  return (value as SignerPayloadJSON).genesisHash !== undefined;
}

export interface RequestSign {
  readonly payload: SignerPayloadJSON;

  sign(registry: TypeRegistry, pair: KeyringPair): { signature: HexString };
}

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  console.log('onRpcRequest:', request.method);

  switch (request.method) {
    case 'createSeed':
      return createSeed();

    case 'createAccountWithSeed':
      const { seed, name } = request.params as Record<string, string>;
      if (!seed || !name) throw new Error('Params not found.');
      return createAccountWithSeed(seed, name);

    case 'getProviderUrl':
      return providerUrl;

    case 'signPayload':
      let payload = request.params as any as
        | SignerPayloadJSON
        | SignerPayloadRaw;
      const isBytes = !isJsonPayload(payload);
      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: panel([
            text(isBytes ? 'Sign bytes' : 'Sign payload'),
            text(`Origin: ${origin}`),
            text(
              isBytes
                ? (payload as SignerPayloadRaw).data
                : JSON.stringify(payload as SignerPayloadJSON),
            ),
          ]),
        },
      });

    case 'approveSignBytes':
      const payloadRaw = request.params as any as SignerPayloadRaw;
      return signBytes(payloadRaw);

    case 'approveSignExtrinsic':
      const payloadExtrinsic = request.params as any as SignerPayloadJSON;
      return signExtrinsic(payloadExtrinsic);

    case 'importAccounts':
      const requestBatchRestore = request.params as any as RequestBatchRestore;
      batchRestore(requestBatchRestore);
      return 'success';

    case 'listAccounts':
      return accountsList();

    default:
      throw new Error('Method not found.');
  }
};
