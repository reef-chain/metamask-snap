import type { HexString } from '@polkadot/util/types';
import keyring from '@polkadot/ui-keyring';
import { cryptoWaitReady, mnemonicGenerate } from '@polkadot/util-crypto';
import { SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types';
import { TypeRegistry } from '@polkadot/types';
import { accounts as accountsObservable } from '@polkadot/ui-keyring/observable/accounts';

import RequestExtrinsicSign from './RequestExtrinsicSign';
import RequestBytesSign from './RequestBytesSign';
import { LocalStore } from './localStore';
import { RequestBatchRestore, RequestJsonRestore } from './types';
import { SubjectInfo } from '@polkadot/ui-keyring/observable/types';

export const providerUrl = 'wss://rpc-testnet.reefscan.info/ws';
export const NO_PASSWORD_USED = 'no_password_used';

cryptoWaitReady()
  .then((): void => {
    console.log('crypto initialized');

    keyring.loadAll({ store: new LocalStore(), type: 'sr25519' });
    console.log('KEYRING LOADED ALL=', keyring.getAccounts().length);
    console.log('initialization completed');
  })
  .catch((error): void => {
    console.error('initialization failed', error);
  });

export const createSeed = (): {
  address: string;
  seed: string;
} => {
  const seed = mnemonicGenerate(12);
  return {
    address: keyring.createFromUri(seed, {}).address,
    seed,
  };
};

export const createAccountWithSeed = (seed: string, name: string): string => {
  const createResult = keyring.addUri(seed, NO_PASSWORD_USED, { name });
  return createResult.pair.address;
};

export const signBytes = async (
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

export const signExtrinsic = async (
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

// TODO: currently password is not used, so these accounts will no be able to sign messages
export const jsonRestore = ({ file, password }: RequestJsonRestore): void => {
  try {
    keyring.restoreAccount(file, password);
  } catch (error) {
    throw new Error((error as Error).message);
  }
};

// TODO: currently password is not used, so these accounts will no be able to sign messages
export const batchRestore = ({ file, password }: RequestBatchRestore): void => {
  try {
    keyring.restoreAccounts(file, password);
  } catch (error) {
    throw new Error((error as Error).message);
  }
};

export const accountsList = (): string[] => {
  const accounts: SubjectInfo = accountsObservable.subject.getValue();
  const accs = Object.values(accounts);

  return accs.map((account) => account.json.address);
};
