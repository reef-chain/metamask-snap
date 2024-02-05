import { type Json, type OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { panel, heading, text, divider } from '@metamask/snaps-ui';
import type { HexString } from '@polkadot/util/types';
import { TypeRegistry } from '@polkadot/types';
import {
  AnyJson,
  SignerPayloadJSON,
  SignerPayloadRaw,
} from '@polkadot/types/types';
import { cryptoWaitReady, mnemonicGenerate } from '@polkadot/util-crypto';
import { Keyring } from './Keyring';

import {
  Account,
  RequestBatchRestore,
  RequestJsonRestore,
  KeyringJson,
  MetadataDef,
} from './types';
import { AccountsStore } from './stores/Accounts';
import { getSelectedAccountIndex } from './utils';
import RequestBytesSign from './RequestBytesSign';
import RequestExtrinsicSign from './RequestExtrinsicSign';
import State from './State';
import { Call } from '@polkadot/types/interfaces';
import { availableNetworks, NetworkName } from './networks';
import MetadataStore from './stores/Metadata';

const NO_PASSWORD_USED = 'no_password_used'; // TODO
let state = new State();

let keyringInitialized = false;
let keyring = new Keyring();
const initKeyring = async () => {
  try {
    await cryptoWaitReady();
    console.log('crypto initialized');
    await keyring.loadAll();
    console.log('KEYRING LOADED ALL=', keyring.getAccounts().length);
    state = new State();
    keyringInitialized = true;
    console.log('initialization completed');
  } catch (error) {
    console.error('crypto initialization failed', error);
  }
};

// TODO: Check why this does not work when executed on file loaded
//       For now, init keyring on first request
// (async () => {
//   await initKeyring();
// })().catch((error) => {
//   console.error('crypto initialization error', error);
// });

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
  if (!keyringInitialized) await initKeyring();

  switch (request.method) {
    // Network
    case 'getNetwork':
      return {
        name: state.network,
        rpcUrl: availableNetworks[state.network].rpcUrl,
      };

    case 'selectNetwork':
      const { network } = request.params as Record<string, string>;
      if (!network || !(network in availableNetworks)) {
        throw new Error('Invalid network');
      }
      state.network = network as NetworkName;
      return {
        name: state.network,
        rpcUrl: availableNetworks[state.network].rpcUrl,
      };

    // Accounts
    case 'createSeed':
      return createSeed();

    case 'createAccountWithSeed':
      const { seed, name } = request.params as Record<string, string>;
      if (!seed || !name) throw new Error('Params not found.');
      return await createAccountWithSeed(seed, name);

    case 'importAccount':
      const requestJsonRestore = request.params as any as RequestJsonRestore;
      jsonRestore(requestJsonRestore);
      return true;

    case 'importAccounts':
      const requestBatchRestore = request.params as any as RequestBatchRestore;
      batchRestore(requestBatchRestore);
      return true;

    case 'forgetAccount':
      const { addressForget } = request.params as Record<string, string>;
      return await forgetAccount(addressForget!);

    case 'listAccounts':
      return accountsList() as unknown as Json;

    case 'selectAccount':
      const { addressSelect } = request.params as Record<string, string>;
      return await selectAccount(addressSelect!);

    // Signing
    case 'requestSignature':
      let payload = request.params as any as
        | SignerPayloadJSON
        | SignerPayloadRaw;
      const isBytes = !isJsonPayload(payload);
      return signatureRequest(payload, isBytes, origin);

    case 'approveSignBytes':
      const payloadRaw = request.params as any as SignerPayloadRaw;
      return signBytes(payloadRaw);

    case 'approveSignExtrinsic':
      const payloadExtrinsic = request.params as any as SignerPayloadJSON;
      return signExtrinsic(payloadExtrinsic);

    // Metadata
    case 'getMetadata':
      const { genesisHash } = request.params as Record<string, string>;
      return state.findMetadata(genesisHash!) as any as Json;

    case 'listMetadata':
      return state.knownMetadata as any as Json;

    case 'provideMetadata':
      const metadataReq = request.params as any as MetadataDef;
      return await provideMetadata(metadataReq, origin);

    // TODO: remove test methods below *************************************************************
    case 'setStore':
      const { address: address1 } = request.params as Record<string, string>;
      return await setStore(address1!);

    case 'getStore':
      const { address: address2 } = request.params as Record<string, string>;
      return (await getStore(address2!)) as unknown as Json;

    case 'getAllAccounts':
      return await getAllAccounts();

    case 'getAllMetadatas':
      return await getAllMetadatas();

    case 'removeStore':
      const { address: address3 } = request.params as Record<string, string>;
      return await removeStore(address3!);

    case 'clearAllStores':
      return clearStores();

    case 'initKeyring':
      await initKeyring();
      return true;

    default:
      throw new Error('Method not found.');
  }
};

const isJsonPayload = (
  value: SignerPayloadJSON | SignerPayloadRaw,
): value is SignerPayloadJSON => {
  return (value as SignerPayloadJSON).genesisHash !== undefined;
};

const transformAccounts = (accounts: KeyringJson[]): Account[] => {
  const filtered = accounts
    .filter(({ meta: { isHidden } }) => !isHidden)
    .sort((a, b) => (a.meta.whenCreated || 0) - (b.meta.whenCreated || 0));

  const selIndex = getSelectedAccountIndex(accounts);
  let selAccountAddress: string;

  if (selIndex != null) {
    selAccountAddress = accounts[selIndex]!.address;
  }

  return filtered.map((val: KeyringJson): Account => {
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
};

const createSeed = (): {
  address: string;
  seed: string;
} => {
  const seed = mnemonicGenerate(12);
  return {
    address: keyring.createFromUri(seed, {}).address,
    seed,
  };
};

const createAccountWithSeed = async (
  seed: string,
  name: string,
): Promise<string> => {
  const createResult = await keyring.addUri(seed, NO_PASSWORD_USED, { name });
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

const forgetAccount = async (address: string) => {
  await keyring.forgetAccount(address);
  return true;
};

const accountsList = (): Account[] => {
  const accounts: KeyringJson[] = keyring.accounts;
  return transformAccounts(accounts);
};

const selectAccount = async (address: string) => {
  const newSelectPair = keyring.getPair(address);
  if (!newSelectPair) return false;

  const res = await keyring.saveAccountMeta(newSelectPair, {
    ...newSelectPair.meta,
    _isSelectedTs: new Date().getTime(),
  });
  return res;
};

const renderMethod = (data: string, genesisHash: string) => {
  const chain = state.findExpandedMetadata(genesisHash);
  if (!chain) return [text(`**Method data**: ${data}`)];

  let args: AnyJson | null = null;
  let method: Call | null = null;

  try {
    method = chain.registry.createType('Call', data);
    args = (method!.toHuman() as { args: AnyJson }).args;
  } catch (error) {
    console.error('Error decoding method', chain);
    return [text(`**Method data**: ${data}`)];
  }

  if (!method || !args) return [text(`**Method data**: ${data}`)];

  const res = [];
  const methodName =
    `${method.section}.${method.method}` +
    (method.meta
      ? `(${method.meta.args.map(({ name }) => name).join(', ')})`
      : '');
  const methodArgs = JSON.stringify(args, null, 2);
  res.push(text(`**Method**: ${methodName}`));
  res.push(text(`**Args**: ${methodArgs}`));
  if (method.meta) {
    res.push(
      text(
        `**Info**: ${method.meta.docs
          .map((d) => d.toString().trim())
          .join(' ')}`,
      ),
    );
  }

  return res;
};

const signatureRequest = (
  payload: SignerPayloadRaw | SignerPayloadJSON,
  isBytes: boolean,
  origin: string,
) => {
  let payloadText = [];
  if (isBytes) {
    payloadText.push(text((payload as SignerPayloadRaw).data));
  } else {
    const jsonPayload = payload as SignerPayloadJSON;

    const network = Object.values(availableNetworks).find(
      (network) => network.genesisHash === jsonPayload.genesisHash,
    );
    if (network) {
      payloadText.push(text(`**Network**: ${network.displayName}`));
    } else {
      payloadText.push(text(`**Genesis**: ${jsonPayload.genesisHash}`));
    }

    payloadText.push(
      ...[
        text(`**Version**: ${Number(jsonPayload.specVersion)}`),
        text(`**Nonce**: ${Number(jsonPayload.nonce)}`),
      ],
    );
    const tip = Number(jsonPayload.tip);
    if (tip) payloadText.push(text(`**Tip**: ${Number(jsonPayload.tip)}`));
    payloadText.push(
      ...renderMethod(jsonPayload.method, jsonPayload.genesisHash),
    );
  }

  return snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: panel([
        heading(isBytes ? 'Sign bytes' : 'Sign payload'),
        divider(),
        text(`**From**: ${origin}`),
        ...payloadText,
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

const provideMetadata = async (metadata: MetadataDef, origin: string) => {
  const currentMetadata = state.knownMetadata.find(
    (result) => result.genesisHash === metadata.genesisHash || null,
  );
  const currentVersion = currentMetadata?.specVersion || '<unknown>';

  let chainText = text(`**Chain**: ${metadata.chain}`);
  const network = Object.values(availableNetworks).find(
    (network) => network.genesisHash === metadata.genesisHash,
  );
  if (network) {
    chainText = text(`**Network**: ${network.displayName}`);
  }

  const approved = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: panel([
        heading('Add metadata'),
        divider(),
        text(`**From**: ${origin}`),
        chainText,
        text(`**Upgrade**: ${currentVersion} -> ${metadata.specVersion}`),
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

// TODO: Remove test methods below
const storeAccounts = new AccountsStore();
const storeMetadata = new MetadataStore();

const setStore = async (address: string) => {
  const account: KeyringJson = {
    address,
    meta: {},
  };
  await storeAccounts.set(address, account);
  return true;
};

const getStore = async (address: string) => {
  return await storeAccounts.get(address);
};

const getAllAccounts = async () => {
  return (await storeAccounts.all()) as any as Json[];
};

const getAllMetadatas = async () => {
  return (await storeMetadata.all()) as any as Json[];
};

const removeStore = async (address: string) => {
  await storeAccounts.remove(address);
  return true;
};

const clearStores = () => {
  storeAccounts.clear();
  return true;
};
