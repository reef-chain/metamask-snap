import {
  type Json,
  type OnRpcRequestHandler,
  OnInstallHandler,
} from '@metamask/snaps-sdk';
import { panel, heading, text, image } from '@metamask/snaps-ui';
import { SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';

import { Keyring } from './signing/Keyring';
import { config } from './config/config';
import { RequestBatchRestore, RequestJsonRestore, MetadataDef } from './types';
import State from './State';
import { availableNetworks, NetworkName } from './config/networks';
import { reefLogo } from './icon';
import {
  accountsList,
  batchRestore,
  clearAllStores,
  createAccountWithSeed,
  createSeed,
  editAccount,
  forgetAccount,
  getAllStores,
  jsonRestore,
  provideMetadata,
  selectAccount,
  signBytes,
  signExtrinsic,
  signatureRequest,
} from './handlers';

export let state = new State();
export let keyring = new Keyring();

let keyringInitialized = false;
const initKeyring = async () => {
  try {
    await cryptoWaitReady();
    console.log('crypto initialized');
    await keyring.loadAll();
    console.log('accounts loaded:', keyring.getAccounts().length);
    state = new State();
    await state.init();
    console.log('selected network:', state.network);
    console.log('metadata defs:', state.knownMetadata.length);
    keyringInitialized = true;
    console.log('initialization completed');
  } catch (error) {
    console.error('crypto initialization failed', error);
  }
};

export const onInstall: OnInstallHandler = async () => {
  await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'alert',
      content: panel([
        image(reefLogo),
        heading('Welcome to Reef Chain Snap'),
        text(
          `To start using it, visit the companion dapp at [${config.dappUrl}](https://${config.dappUrl}).`,
        ),
      ]),
    },
  });
};

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
    // Default extension
    case 'isDefaultExtension':
      return {
        setAsDefault: state.lastSetAsDefault > 0,
        lastSet: state.lastSetAsDefault,
      };

    case 'setAsDefaultExtension':
      const { isDefault } = request.params as Record<string, boolean>;
      await state.setAsDefault(isDefault as boolean);
      return state.lastSetAsDefault > 0;

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
      await state.setNetwork(network as NetworkName);
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

    case 'renameAccount':
      const { addressRename, newName } = request.params as Record<string, string>;
      if (!addressRename || !newName) throw new Error('Params not found.');
      return await editAccount(addressRename, newName);

    case 'importAccount':
      const requestJsonRestore = request.params as any as RequestJsonRestore;
      await jsonRestore(requestJsonRestore);
      return true;

    // TODO: password is for batch file, but we need passwords fo each account to unlock them
    // case 'importAccounts':
    //   const requestBatchRestore = request.params as any as RequestBatchRestore;
    //   await batchRestore(requestBatchRestore);
    //   return true;

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
      const isBytes = !(payload as SignerPayloadJSON).genesisHash;
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

    // Test storage
    // TODO: remove
    case 'getAllStores':
      return await getAllStores();

    case 'clearAllStores':
      return clearAllStores();

    default:
      throw new Error('Method not found.');
  }
};
