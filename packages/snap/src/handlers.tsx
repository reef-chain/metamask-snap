import { type Json, panel, heading, text, divider, copyable, DialogResult } from '@metamask/snaps-sdk';
import type { HexString } from '@polkadot/util/types';
import { TypeRegistry } from '@polkadot/types';
import { Call } from '@polkadot/types/interfaces';
import {
  AnyJson,
  SignerPayloadJSON,
  SignerPayloadRaw,
} from '@polkadot/types/types';
import { mnemonicGenerate } from '@polkadot/util-crypto';
import { KeyringPair$Json } from '@polkadot/keyring/types';

import {
  Account,
  RequestBatchRestore,
  RequestJsonRestore,
  KeyringJson,
  MetadataDef,
} from './types';
import { AccountsStore } from './stores/Accounts';
import { MetadataStore } from './stores/Metadata';
import RequestBytesSign from './signing/RequestBytesSign';
import RequestExtrinsicSign from './signing/RequestExtrinsicSign';
import { Network, availableNetworks } from './config/networks';
import { keyring, state } from './index';
import { getSelectedAccountIndex } from './utils';
import { PreferencesStore } from './stores/Preferences';

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

export const createAccountWithSeed = async (
  seed: string,
  name: string,
): Promise<string> => {
  const createResult = await keyring.addUri(seed, { name });
  return createResult.pair.address;
};

export const editAccount = async (
  address: string,
  name: string,
): Promise<boolean> => {
  const pair = keyring.getPair(address);
  if (!pair) throw new Error('Account not found');
  await keyring.saveAccountMeta(pair, { ...pair.meta, name });
  return true;
};

export const jsonRestore = async ({
  json,
  password,
}: RequestJsonRestore): Promise<void> => {
  try {
    await keyring.restoreAccount(json, password);
  } catch (error) {
    throw new Error((error as Error).message);
  }
};

export const batchRestore = async ({
  file,
  password,
}: RequestBatchRestore): Promise<void> => {
  try {
    await keyring.restoreAccounts(file, password);
  } catch (error) {
    throw new Error((error as Error).message);
  }
};

export const exportAccount = (
  address: string,
  password: string,
): KeyringPair$Json => {
  const pair = keyring.getPair(address);
  return keyring.backupAccount(pair, password);
};

export const forgetAccount = async (address: string) => {
  const account = keyring.getPair(address);
  if (!account) throw new Error('Account not found');

  const approved = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: panel([
        heading('Forget account'),
        text('**Name**'),
        copyable(account?.meta.name || '<unknown>'),
        text('**Address**'),
        copyable(address),
        divider(),
        text(
          '⚠️ _You are about to remove the account. This means that you will not be able to access it via this extension anymore. If you wish to recover it, you would need to use the seed._',
        ),
      ]),
    },
  });

  if (!approved) return false;

  await keyring.forgetAccount(address);
  return true;
};

export const accountsList = (): Account[] => {
  const accounts: KeyringJson[] = keyring.accounts;
  const filtered = accounts
    .filter(({ meta: { isHidden } }) => !isHidden)
    .sort((a, b) => (a.meta.whenCreated || 0) - (b.meta.whenCreated || 0));

  const selIndex = getSelectedAccountIndex(accounts);

  let selAccountAddress: string;

  if (selIndex != null) {
    selAccountAddress = accounts[selIndex]!.address;
  }

  const accountsTransformed = filtered.map((val: KeyringJson): Account => {
    const {
      address,
      meta: { name },
    } = val;

    return {
      address,
      name: name || '<unknown>',
      isSelected: address === selAccountAddress,
    };
  });

  return accountsTransformed;
};

export const selectAccount = async (address: string) => {
  const newSelectPair = keyring.getPair(address);
  if (!newSelectPair) return false;

  const res = await keyring.saveAccountMeta(newSelectPair, {
    ...newSelectPair.meta,
    _isSelectedTs: new Date().getTime(),
  });
  return res;
};

export const signatureRequest = async (
  payload: SignerPayloadRaw | SignerPayloadJSON,
  isBytes: boolean,
  origin: string,
) => {
  let payloadText = [];
  if (isBytes) {
    payloadText.push(
      text('**Message**'),
      copyable((payload as SignerPayloadRaw).data),
    );
  } else {
    const jsonPayload = payload as SignerPayloadJSON;

    const network = Object.values(availableNetworks).find(
      (network) => network.genesisHash === jsonPayload.genesisHash,
    );
    if (!network) throw new Error('Network not found');

    payloadText.push(
      text('**Network**'),
      copyable(network.displayName),
      text('**Version**'),
      copyable(Number(jsonPayload.specVersion).toString()),
      text('**Nonce**'),
      copyable(Number(jsonPayload.nonce).toString()),
    );
    const tip = Number(jsonPayload.tip);
    if (tip) {
      payloadText.push(text('**Tip**'), copyable(tip.toString()));
    }
    payloadText.push(...renderMethod(jsonPayload.method, network));
  }

  const approved: DialogResult = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: panel([
        heading(isBytes ? 'Sign bytes' : 'Sign payload'),
        text('**From**'),
        copyable(origin),
        ...payloadText,
      ]),
    },
  });

  if (approved !== true) return false;

  if (isBytes) {
    return signBytes(payload as SignerPayloadRaw);
  } else {
    return signExtrinsic(payload as SignerPayloadJSON);
  }  
};

const signBytes = async (
  payload: SignerPayloadRaw,
): Promise<{ signature: HexString }> => {
  const rawRequest = new RequestBytesSign(payload);

  const pair = keyring.getPair(payload.address);
  if (pair.isLocked) {
    pair.decodePkcs8();
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
    pair.decodePkcs8();
  }

  const registry = new TypeRegistry();
  registry.setSignedExtensions(payload.signedExtensions);
  return extrinsicRequest.sign(registry, pair);
};

export const provideMetadata = async (
  metadata: MetadataDef,
  origin: string,
) => {
  const currentMetadata = state.knownMetadata.find(
    (result) => result.genesisHash === metadata.genesisHash || null,
  );
  const currentVersion = currentMetadata?.specVersion || '<unknown>';

  const network = Object.values(availableNetworks).find(
    (network) => network.genesisHash === metadata.genesisHash,
  );
  if (!network) throw new Error('Network not found');

  const approved = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: panel([
        heading('Add metadata'),
        text('**From**'),
        copyable(origin),
        text('**Network**'),
        copyable(network.displayName),
        text('**Upgrade**'),
        copyable(`${currentVersion} -> ${metadata.specVersion}`),
        divider(),
        text(
          '⚠️ _This approval will add the metadata to your extension instance, allowing future requests to be decoded using this metadata._',
        ),
      ]),
    },
  });

  if (!approved) return false;

  await state.saveMetadata(metadata);
  return true;
};

export const getAllStores = async () => {
  const storeAccounts = new AccountsStore();
  const storeMetadata = new MetadataStore();
  const storePreferences = new PreferencesStore();
  const accounts = await storeAccounts.all();
  const metadata = await storeMetadata.all();
  const preferences = await storePreferences.all();
  return { accounts, metadata, preferences } as any as Json[];
};

export const clearAllStores = async () => {
  const storeAccounts = new AccountsStore();
  const storeMetadata = new MetadataStore();
  const storePreferences = new PreferencesStore();
  await storeAccounts.clear();
  await storeMetadata.clear();
  await storePreferences.clear();

  const accounts = keyring.getAccounts();
  for (const account of accounts) {
    await keyring.forgetAccount(account.address);
  }

  return true;
};

const renderMethod = (data: string, network: Network) => {
  const chain = state.findExpandedMetadata(network.genesisHash);
  if (!chain) return [text('**Method data**'), copyable(data)];

  let args: any = null;
  let method: Call | null = null;

  try {
    method = chain.registry.createType('Call', data);
    args = (method!.toHuman() as { args: AnyJson }).args;
  } catch (error) {
    console.error('Error decoding method', chain);
    return [text('**Method data**'), copyable(data)];
  }

  if (!method || !args) return [text('**Method data**'), copyable(data)];

  const res = [];
  const methodName = `${method.section}.${method.method}`;
  const methodSignature =
    methodName +
    (method.meta
      ? `(${method.meta.args.map(({ name }) => name).join(', ')})`
      : '');
  res.push(text('**Method**'), copyable(methodSignature));

  if (
    methodSignature === 'evm.call(target, input, value, gasLimit, storageLimit)'
  ) {
    res.push(
      text(`**Target** [🔍](${network.reefscanUrl}/contract/${args.target})`),
      copyable(args.target),
      text('**Input**'),
      copyable(args.input),
      text('**Value**'),
      copyable(args.value),
      text('**Gas limit**'),
      copyable(args.gas_limit),
      text('**Storage limit**'),
      copyable(args.storage_limit),
    );
  } else {
    const methodArgs = JSON.stringify(args, null, 2);
    res.push(text('**Args**'), copyable(methodArgs));
  }

  if (method.meta) {
    let docs = method.meta.docs.map((d) => d.toString().trim()).join(' ');
    docs = docs.split(' # <weight>').shift() || docs;
    if (docs.length) {
      res.push(divider(), text(`ℹ️ ${docs}`));
    }
  }

  return res;
};
