import type { Json, OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { panel, text } from '@metamask/snaps-sdk';
import type { HexString } from '@polkadot/util/types';
import { TypeRegistry } from '@polkadot/types';
import { SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types';
import { cryptoWaitReady, mnemonicGenerate } from '@polkadot/util-crypto';
import keyring from '@polkadot/ui-keyring';
import { KeyringJson } from '@polkadot/ui-keyring/types';
import {
  SingleAddress,
  SubjectInfo,
} from '@polkadot/ui-keyring/observable/types';
import { accounts as accountsObservable } from '@polkadot/ui-keyring/observable/accounts';

import { Account, RequestBatchRestore, RequestJsonRestore } from './types';
import { AccountsStore } from './stores/Accounts';
import { getSelectedAccountIndex } from './utils';
import RequestBytesSign from './RequestBytesSign';
import RequestExtrinsicSign from './RequestExtrinsicSign';
import { LocalStoreTest } from './localStoreTest';

// TODO: select provider
const providerUrl = 'wss://rpc-testnet.reefscan.info/ws';
const NO_PASSWORD_USED = 'no_password_used';

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
  console.log('=> onRpcRequest:', request.method);

  switch (request.method) {
    case 'getProviderUrl':
      return providerUrl;

    case 'createSeed':
      return createSeed();

    case 'createAccountWithSeed':
      const { seed, name } = request.params as Record<string, string>;
      if (!seed || !name) throw new Error('Params not found.');
      return createAccountWithSeed(seed, name);

    case 'importAccount':
      const requestJsonRestore = request.params as any as RequestJsonRestore;
      jsonRestore(requestJsonRestore);
      return 'success';

    case 'importAccounts':
      const requestBatchRestore = request.params as any as RequestBatchRestore;
      batchRestore(requestBatchRestore);
      return 'success';

    case 'forgetAccount':
      const { address } = request.params as Record<string, string>;
      return forgetAccount(address!);

    case 'listAccounts':
      return accountsList() as unknown as Json;

    case 'signatureRequest':
      let payload = request.params as any as
        | SignerPayloadJSON
        | SignerPayloadRaw;
      const isBytes = !isJsonPayload(payload);
      return signatureRequest(payload, isBytes);

    case 'approveSignBytes':
      const payloadRaw = request.params as any as SignerPayloadRaw;
      return signBytes(payloadRaw);

    case 'approveSignExtrinsic':
      const payloadExtrinsic = request.params as any as SignerPayloadJSON;
      return signExtrinsic(payloadExtrinsic);

    // TODO: remove test methods below
    case 'setStore':
      const { address: address1 } = request.params as Record<string, string>;
      return setStore(address1!);

    case 'getStore':
      const { address: address2 } = request.params as Record<string, string>;
      return getStore(address2!) as unknown as Json;

    case 'getAllStores':
      return getAllStores();

    case 'removeStore':
      const { address: address3 } = request.params as Record<string, string>;
      return removeStore(address3!);

    case 'clearAllStores':
      return clearStores();

    default:
      throw new Error('Method not found.');
  }
};

cryptoWaitReady()
  .then((): void => {
    console.log('crypto initialized');

    keyring.loadAll({ store: new AccountsStore(), type: 'sr25519' });
    console.log('KEYRING LOADED ALL=', keyring.getAccounts().length);
    console.log('initialization completed');
  })
  .catch((error): void => {
    console.error('initialization failed', error);
  });

const isJsonPayload = (
  value: SignerPayloadJSON | SignerPayloadRaw,
): value is SignerPayloadJSON => {
  return (value as SignerPayloadJSON).genesisHash !== undefined;
};

const transformAccounts = (accounts: SubjectInfo): Account[] => {
  const accs = Object.values(accounts);

  const filtered = accs
    .filter(
      ({
        json: {
          meta: { isHidden },
        },
      }) => !isHidden,
    )
    .sort(
      (a, b) => (a.json.meta.whenCreated || 0) - (b.json.meta.whenCreated || 0),
    );

  const selIndex = getSelectedAccountIndex(accs.map((sa) => sa.json));
  let selAccountAddress: string;

  if (selIndex != null) {
    selAccountAddress = accs[selIndex]!.json.address;
  }

  return filtered.map((val: SingleAddress): Account => {
    const {
      json: {
        address,
        meta: { name },
      },
    } = val;

    return {
      address,
      name: name || '<unknown>',
      isSelected: address === selAccountAddress,
    };
  });
};

const createSeed = (): {
  address: string;
  seed: string;
} => {
  const seed = mnemonicGenerate(12);
  return {
    address: keyring.createFromUri(seed, {}, 'sr25519').address,
    seed,
  };
};

const createAccountWithSeed = (seed: string, name: string): string => {
  const createResult = keyring.addUri(
    seed,
    NO_PASSWORD_USED,
    { name },
    'sr25519',
  );
  return createResult.pair.address;
};

// TODO: currently password is not used, so these accounts will no be able to sign messages
const jsonRestore = ({ file, password }: RequestJsonRestore): void => {
  try {
    keyring.restoreAccount(file, password);
  } catch (error) {
    throw new Error((error as Error).message);
  }
};

// TODO: currently password is not used, so these accounts will no be able to sign messages
const batchRestore = ({ file, password }: RequestBatchRestore): void => {
  try {
    keyring.restoreAccounts(file, password);
  } catch (error) {
    throw new Error((error as Error).message);
  }
};

const forgetAccount = (address: string): boolean => {
  keyring.forgetAccount(address);
  return true;
};

const accountsList = (): Account[] => {
  const accounts: SubjectInfo = accountsObservable.subject.getValue();
  return transformAccounts(accounts);
};

const signatureRequest = (
  payload: SignerPayloadRaw | SignerPayloadJSON,
  isBytes: boolean,
) => {
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
};

const signBytes = async (
  payload: SignerPayloadRaw,
): Promise<{ signature: HexString }> => {
  const rawRequest = new RequestBytesSign(payload);

  const pair = keyring.getPair(payload.address);
  if (pair.isLocked) {
    pair.decodePkcs8(NO_PASSWORD_USED);
  }

  const registry = new TypeRegistry();
  return rawRequest.sign(registry, pair);
};

const signExtrinsic = async (
  payload: SignerPayloadJSON,
): Promise<{ signature: HexString }> => {
  const extrinsicRequest = new RequestExtrinsicSign(payload);

  const pair = keyring.getPair(payload.address);
  if (pair.isLocked) {
    pair.decodePkcs8(NO_PASSWORD_USED);
  }

  const registry = new TypeRegistry();
  registry.setSignedExtensions(payload.signedExtensions);
  return extrinsicRequest.sign(registry, pair);
};

// TODO: Remove test methods below
const store = new LocalStoreTest();

const setStore = (address: string) => {
  const account: KeyringJson = {
    address,
    meta: {},
  };
  return store.set(address, account);
};

const getStore = (address: string) => {
  return store.get(address);
};

const getAllStores = () => {
  return store.all();
};

const removeStore = (address: string) => {
  return store.remove(address);
};

const clearStores = () => {
  return store.clear();
};
