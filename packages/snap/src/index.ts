import {
  type Json,
  type OnRpcRequestHandler,
  OnInstallHandler,
  panel,
  heading,
  text,
  image 
} from '@metamask/snaps-sdk';
import { SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';

import { Keyring } from './signing/Keyring';
import { config } from './config/config';
import { RequestJsonRestore, MetadataDef } from './types';
import State from './State';
import { availableNetworks, NetworkName } from './config/networks';
import { reefLogo } from './icon';
import {
  accountsList,
  clearAllStores,
  createAccountWithSeed,
  createSeed,
  editAccount,
  exportAccount,
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
    if (config.debug) console.log('crypto initialized');
    await keyring.loadAll();
    if (config.debug) console.log('accounts loaded:', keyring.getAccounts().length);
    state = new State();
    await state.init();
    if (config.debug) console.log('selected network:', state.network);
    if (config.debug) console.log('metadata defs:', state.knownMetadata.length);
    keyringInitialized = true;
    if (config.debug) console.log('initialization completed');
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

export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  if (config.debug) console.log('=> onRpcRequest:', request.method);
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
      const { addressRename, newName } = request.params as Record<
        string,
        string
      >;
      if (!addressRename || !newName) throw new Error('Params not found.');
      return await editAccount(addressRename, newName);

    case 'importAccount':
      const requestJsonRestore = request.params as any as RequestJsonRestore;
      await jsonRestore(requestJsonRestore);
      return true;

    // TODO: Password is for batch file, but we need passwords fo each account to unlock them.
    //       So batch import is not supported for now.
    // case 'importAccounts':
    //   const requestBatchRestore = request.params as any as RequestBatchRestore;
    //   await batchRestore(requestBatchRestore);
    //   return true;

    case 'exportAccount':
      const { addressExport, passwordExport } = request.params as Record<
        string,
        string
      >;
      if (!addressExport || !passwordExport)
        throw new Error('Params not found.');
      return exportAccount(addressExport, passwordExport) as unknown as Json;

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
    // TODO: remove test utilities
    // case 'getAllStores':
    //   return await getAllStores();

    // case 'clearAllStores':
    //   return clearAllStores();

    default:
      throw new Error('Method not found.');
  }
};
