// Copyright 2019-2021 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types';
import type {
  SignerPayloadJSON,
  SignerPayloadRaw,
} from '@polkadot/types/types';
import type { HexString } from '@polkadot/util/types';

import { TypeRegistry } from '@polkadot/types';
import { KeyringPairs$Json } from '@polkadot/ui-keyring/types';

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
  icon: string;
  ss58Format: number;
  chainType?: 'substrate' | 'ethereum';
}

export interface MetadataDef extends MetadataDefBase {
  color?: string;
  specVersion: number;
  tokenDecimals: number;
  tokenSymbol: string;
  types: Record<string, Record<string, string> | string>;
  metaCalls?: string;
  userExtensions?: ExtDef;
}
