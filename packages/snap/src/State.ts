// Copyright 2019-2021 @polkadot/extension-bg authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { assert } from '@polkadot/util';

// import type { AccountJson, RequestAuthorizeTab, RequestSign, ResponseSigning } from '../types';
import { Chain, MetadataDef } from './types';
import MetadataStore from './stores/Metadata';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { base64Decode } from '@polkadot/util-crypto';

const definitions = new Map<string, MetadataDef>();
const expanded = new Map<string, Chain>();

export function addMetadata(def: MetadataDef): void {
  definitions.set(def.genesisHash, def);
}

// export function findMetadata(genesisHash: string): MetadataDef | undefined {
//   return definitions.get(genesisHash);
// }

// export function knownMetadata(): MetadataDef[] {
//   return [...definitions.values()];
// }

// TODO
export default class State {
  //   readonly #authUrls: AuthUrls = {};
  readonly #metaStore = new MetadataStore();
  // Map of providers currently injected in tabs
  //   readonly #injectedProviders = new Map<chrome.runtime.Port, ProviderInterface>();
  // Map of all providers exposed by the extension, they are retrievable by key
  //   readonly #providers: Providers;

  constructor() {
    this.#metaStore.allAsync().then((defs: MetadataDef[]) => {
      defs.forEach((def) => addMetadata(def));
    });
  }

  public get knownMetadata(): MetadataDef[] {
    return [...definitions.values()];
  }

  public findMetadata(genesisHash: string): MetadataDef | undefined {
    return definitions.get(genesisHash);
  }

  public findExpandedMetadata(genesisHash: string): Chain | undefined {
    const def = definitions.get(genesisHash);
    if (!def) return undefined;
    return this.expandMetadata(def);
  }

  public saveMetadata(meta: MetadataDef): void {
    console.log('saveMetadata');
    this.#metaStore.setAsync(meta.genesisHash, meta);
    console.log('saveMetadata done');
    addMetadata(meta);
  }

  private expandMetadata(definition: MetadataDef): Chain {
    const cached = expanded.get(definition.genesisHash);

    if (cached && cached.specVersion === definition.specVersion) {
      return cached;
    }

    const { chain, genesisHash, metaCalls, specVersion, types } = definition;
    const registry = new TypeRegistry();

    registry.register(types);

    registry.setChainProperties(
      // @ts-ignore
      registry.createType('ChainProperties', {
        ss58Format: 42,
        tokenDecimals: 18,
        tokenSymbol: 'REEF',
      }),
    );

    const hasMetadata = !!metaCalls;

    if (hasMetadata) {
      registry.setMetadata(
        new Metadata(registry, base64Decode(metaCalls || '')),
        undefined,
      );
    }

    const result: Chain = {
      definition,
      genesisHash,
      hasMetadata,
      name: chain,
      registry,
      specVersion,
    };

    expanded.set(result.genesisHash, result);

    return result;
  }
}
