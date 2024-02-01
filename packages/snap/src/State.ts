// Copyright 2019-2021 @polkadot/extension-bg authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { assert } from '@polkadot/util';

// import type { AccountJson, RequestAuthorizeTab, RequestSign, ResponseSigning } from '../types';
import { Chain, MetadataDef } from './types';
import MetadataStore from './stores/Metadata';
import NetworkStore from './stores/Network';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { base64Decode } from '@polkadot/util-crypto';
import { NetworkName } from './networks';

const SELECTED_NETWORK_KEY = 'selected-network';
const DEFAULT_NETWORK = 'testnet'; // TODO switch to mainnet
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

export default class State {
  readonly #networkStore = new NetworkStore();
  #network?: NetworkName;
  //   readonly #authUrls: AuthUrls = {};
  readonly #metaStore = new MetadataStore();

  constructor() {
    this.#networkStore.getAsync(SELECTED_NETWORK_KEY).then((network) => {
      console.log('selected network', network);
      this.#network = network || DEFAULT_NETWORK;
    });

    this.#metaStore.allAsync().then((defs: MetadataDef[]) => {
      console.log('metadatas', defs.length);
      defs.forEach((def) => addMetadata(def));
    });
  }

  public get network(): NetworkName {
    return this.#network || DEFAULT_NETWORK;
  }

  public set network(network: NetworkName) {
    this.#network = network;
    this.#networkStore.setAsync(SELECTED_NETWORK_KEY, network);
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

  public async saveMetadata(meta: MetadataDef): Promise<void> {
    console.log('saveMetadata');
    await this.#metaStore.setAsync(meta.genesisHash, meta);
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
