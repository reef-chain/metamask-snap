import type { ApiPromise } from '@polkadot/api';
import { getSpecTypes } from '@polkadot/types-known';
import { Buffer } from 'buffer';
import { MetadataDef } from '../../../snap/src/types';

export function getMetadata(api: ApiPromise, systemChain: string): MetadataDef {
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
