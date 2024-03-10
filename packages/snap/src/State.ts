// Copyright 2019-2021 @polkadot/extension-bg authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Chain, MetadataDef } from './types';
import { MetadataStore } from './stores/Metadata';
import { PreferencesStore } from './stores/Preferences';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { base64Decode } from '@polkadot/util-crypto';
import { NetworkName } from './config/networks';
import { config } from './config/config';

const SELECTED_NETWORK_KEY = 'selected-network';
const definitions = new Map<string, MetadataDef>();
const expanded = new Map<string, Chain>();

export function addMetadata(def: MetadataDef): void {
  definitions.set(def.genesisHash, def);
}

export default class State {
  readonly #preferencesStore = new PreferencesStore();
  #network?: NetworkName;
  readonly #metaStore = new MetadataStore();

  async init() {
    const [metaDefs, selectedNetwork] = await Promise.all([
      this.#metaStore.all(),
      this.#preferencesStore.get(SELECTED_NETWORK_KEY),
    ]);
    this.#network = selectedNetwork || config.defaultNetwork;
    metaDefs.forEach((def) => addMetadata(def));
  }

  public get network(): NetworkName {
    return this.#network || config.defaultNetwork;
  }

  public async setNetwork(network: NetworkName) {
    this.#network = network;
    await this.#preferencesStore.set(SELECTED_NETWORK_KEY, network);
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
    await this.#metaStore.set(meta.genesisHash, meta);
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
