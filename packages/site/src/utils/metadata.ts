import type { ApiPromise } from '@polkadot/api';
import { getSpecTypes } from '@polkadot/types-known';
import { Buffer } from 'buffer';
import { MetadataDef } from '../../../snap/src/types';

const genesisHashToNetworkName: Record<string, string> = {
  ['0x7834781d38e4798d548e34ec947d19deea29df148a7bf32484b7b24dacf8d4b7']:
    'mainnet',
  ['0xb414a8602b2251fa538d38a9322391500bd0324bc7ac6048845d57c37dd83fe6']:
    'testnet',
};

export function getMetadata(api: ApiPromise): MetadataDef {
  const systemChain = genesisHashToNetworkName[api.genesisHash.toHex()] || '';

  return {
    chain: systemChain,
    genesisHash: api.genesisHash.toHex(),
    specVersion: api.runtimeVersion.specVersion.toNumber(),
    metaCalls: Buffer.from(api.runtimeMetadata.asCallsOnly.toU8a()).toString(
      'base64',
    ),
    types: getSpecTypes(
      api.registry,
      systemChain,
      api.runtimeVersion.specName,
      api.runtimeVersion.specVersion,
    ) as unknown as Record<string, string>,
  };
}
