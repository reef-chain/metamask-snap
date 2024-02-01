// Copyright 2019-2021 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type {
  KeyringPair,
  KeyringPair$Json,
  KeyringPair$Meta,
} from '@polkadot/keyring/types';
import type {
  Registry,
  SignerPayloadJSON,
  SignerPayloadRaw,
} from '@polkadot/types/types';
import type { HexString } from '@polkadot/util/types';
import { TypeRegistry } from '@polkadot/types';
import { EncryptedJson } from '@polkadot/util-crypto/json/types';

export interface KeyringJson {
  address: string;
  meta: KeyringPair$Meta;
}

interface KeyringPairs$Json extends EncryptedJson {
  accounts: KeyringJson[];
}

export interface KeyringAddress {
  readonly address: string;
  readonly meta: KeyringPair$Meta;
  readonly publicKey: Uint8Array;
}

export interface CreateResult {
  json: KeyringPair$Json;
  pair: KeyringPair;
}

export interface RequestSign {
  readonly payload: SignerPayloadJSON | SignerPayloadRaw;
  sign(registry: TypeRegistry, pair: KeyringPair): { signature: HexString };
}

export interface RequestJsonRestore {
  file: KeyringPair$Json;
  password: string;
}

export interface RequestBatchRestore {
  file: KeyringPairs$Json;
  password: string;
}

export interface Account {
  address: string;
  name: string;
  isSelected: boolean;
}

export declare type ExtTypes = Record<string, string>;
export declare type ExtInfo = {
  extrinsic: ExtTypes;
  payload: ExtTypes;
};
export declare type ExtDef = Record<string, ExtInfo>;

export interface MetadataDefBase {
  chain: string;
  genesisHash: string;
}

export interface MetadataDef extends MetadataDefBase {
  specVersion: number;
  types: Record<string, Record<string, string> | string>;
  metaCalls?: string;
}

export interface Chain {
  definition: MetadataDef;
  genesisHash: string;
  hasMetadata: boolean;
  name: string;
  registry: Registry;
  specVersion: number;
}
