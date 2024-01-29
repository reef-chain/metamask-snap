import { type Json, type OnRpcRequestHandler } from '@metamask/snaps-sdk';
import {
  panel,
  heading,
  text,
  divider,
  image,
  copyable,
} from '@metamask/snaps-ui';
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
  Chain,
} from './types';
import { AccountsStore } from './stores/Accounts';
import { getSelectedAccountIndex } from './utils';
import RequestBytesSign from './RequestBytesSign';
import RequestExtrinsicSign from './RequestExtrinsicSign';
import { reefLogo } from './icon';
import State from './State';
import { Call } from '@polkadot/types/interfaces';

// TODO: select provider
const providerUrl = 'wss://rpc-testnet.reefscan.info/ws';
const NO_PASSWORD_USED = 'no_password_used'; // TODO
const state = new State();

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
      return 'true';

    case 'importAccounts':
      const requestBatchRestore = request.params as any as RequestBatchRestore;
      batchRestore(requestBatchRestore);
      return 'true';

    case 'forgetAccount':
      const { address } = request.params as Record<string, string>;
      return await forgetAccount(address!);

    case 'listAccounts':
      return accountsList() as unknown as Json;

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
      return provideMetadata(metadataReq, origin);

    // TODO: remove test methods below *************************************************************
    case 'setStore':
      const { address: address1 } = request.params as Record<string, string>;
      return await setStore(address1!);

    case 'getStore':
      const { address: address2 } = request.params as Record<string, string>;
      return (await getStore(address2!)) as unknown as Json;

    case 'getAllStores':
      return await getAllStores();

    case 'removeStore':
      const { address: address3 } = request.params as Record<string, string>;
      return await removeStore(address3!);

    case 'clearAllStores':
      return clearStores();

    default:
      throw new Error('Method not found.');
  }
};

let keyring = new Keyring();

cryptoWaitReady()
  .then((): void => {
    console.log('crypto initialized');

    keyring.loadAll();
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
  return 'success';
};

const accountsList = (): Account[] => {
  const accounts: KeyringJson[] = keyring.accounts;
  return transformAccounts(accounts);
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
    `${method.section}.${method.method}` + method.meta
      ? `(${method.meta.args.map(({ name }) => name).join(', ')})`
      : '';
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

    const metadata = state.findMetadata(jsonPayload.genesisHash);
    if (metadata) {
      payloadText.push(text(`**Chain**: ${metadata.chain}`));
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
        // image(reefLogo),
        heading(isBytes ? 'Sign bytes' : 'Sign payload'),
        divider(),
        text(`**From**: ${origin}`),
        // copyable('Text to be copied'),
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

  const approved = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: panel([
        // image(reefLogo),
        heading('Add metadata'),
        divider(),
        text(`**From**: ${origin}`),
        text(`**Chain**: ${metadata.chain}`),
        text(`**Upgrade**: ${currentVersion} -> ${metadata.specVersion}`),
        divider(),
        text(
          '⚠️ _This approval will add the metadata to your extension instance, allowing future requests to be decoded using this metadata._',
        ),
      ]),
    },
  });

  if (!approved) return 'false';

  state.saveMetadata(metadata);
  return 'true';
};

// TODO: Remove test methods below
const storeAccounts = new AccountsStore();

const setStore = async (address: string) => {
  const account: KeyringJson = {
    address,
    meta: {},
  };
  await storeAccounts.setAsync(address, account);
  return 'success';
};

const getStore = async (address: string) => {
  return await storeAccounts.getAsync(address);
};

const getAllStores = async () => {
  return (await storeAccounts.allAsync()) as any as Json[];
};

const removeStore = async (address: string) => {
  await storeAccounts.removeAsync(address);
  return 'success';
};

const clearStores = () => {
  storeAccounts.clear();
  return 'success';
};
