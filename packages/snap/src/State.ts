// Copyright 2019-2021 @polkadot/extension-bg authors & contributors
// SPDX-License-Identifier: Apache-2.0

// import type { MetadataDef, ProviderMeta } from '@reef-defi/extension-inject/types';
// import { addMetadata, knownMetadata } from '@reef-defi/extension-chains';
import { assert } from '@polkadot/util';

// import type { AccountJson, RequestAuthorizeTab, RequestSign, ResponseSigning } from '../types';
import { MetadataDef } from './types';

const definitions = new Map<string, MetadataDef>();

export function addMetadata(def: MetadataDef): void {
  definitions.set(def.genesisHash, def);
}

export function knownMetadata(): MetadataDef[] {
  return [...definitions.values()];
}

// TODO
export default class State {
  //   readonly #authUrls: AuthUrls = {};
  // readonly #metaStore = new MetadataStore();
  // Map of providers currently injected in tabs
  //   readonly #injectedProviders = new Map<chrome.runtime.Port, ProviderInterface>();
  // Map of all providers exposed by the extension, they are retrievable by key
  //   readonly #providers: Providers;

  constructor() {
    // this.#metaStore.all((_key: string, def: MetadataDef): void => {
    //   addMetadata(def);
    // });
  }

  // public get knownMetadata(): MetadataDef[] {
  //   return knownMetadata();
  // }

  // public saveMetadata(meta: MetadataDef): void {
  //   this.#metaStore.set(meta.genesisHash, meta);
  //   addMetadata(meta);
  // }
}
