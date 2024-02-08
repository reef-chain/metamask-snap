// Adapted from https://github.com/polkadot-js/ui/blob/master/packages/ui-keyring/src/Keyring.ts

import type {
  KeyringInstance,
  KeyringPair,
  KeyringPair$Json,
  KeyringPair$Meta,
} from '@polkadot/keyring/types';
import type { KeypairType } from '@polkadot/util-crypto/types';
import type { EncryptedJson } from '@polkadot/util-crypto/json/types';
import { createPair } from '@polkadot/keyring';
import { Keyring as BaseKeyring, decodeAddress } from '@polkadot/keyring';
import { hexToU8a, isHex, isString, u8aToString } from '@polkadot/util';
import type { Prefix } from '@polkadot/util-crypto/address/types';
import { u8aToHex } from '@polkadot/util';
import { base64Decode, jsonDecrypt } from '@polkadot/util-crypto';

import { AccountsStore } from '../stores/Accounts';
import { CreateResult, KeyringAddress, KeyringJson } from '../types';

export class Keyring {
  #accounts: Record<string, KeyringJson> = {};
  #keyring?: KeyringInstance;
  private _store: AccountsStore;

  constructor() {
    this._store = new AccountsStore();
  }

  public get accounts(): KeyringJson[] {
    return Object.values(this.#accounts);
  }

  public get keyring(): KeyringInstance {
    if (this.#keyring) {
      return this.#keyring;
    }

    throw new Error("Keyring should be initialised via 'loadAll' before use");
  }

  public async loadAll(): Promise<void> {
    this.initKeyring();

    const keyringJsons: KeyringJson[] = await this._store.all();
    keyringJsons.forEach((keyringJson: KeyringJson) => {
      this.loadAccount(keyringJson);
    });
  }

  public getPair(address: string | Uint8Array): KeyringPair {
    return this.keyring.getPair(address);
  }

  public async addPair(pair: KeyringPair): Promise<CreateResult> {
    // Remove password
    pair.encodePkcs8();

    this.keyring.addPair(pair);

    return {
      json: await this.saveAccount(pair),
      pair,
    };
  }

  public async addUri(
    suri: string,
    meta: KeyringPair$Meta = {},
  ): Promise<CreateResult> {
    const pair = this.keyring.addFromUri(suri, meta, 'sr25519');
    console.log('pair is locked', pair.isLocked);

    return {
      json: await this.saveAccount(pair),
      pair,
    };
  }

  public createFromUri(suri: string, meta: KeyringPair$Meta = {}): KeyringPair {
    return this.keyring.createFromUri(suri, meta, 'sr25519');
  }

  public async forgetAccount(address: string): Promise<void> {
    this.keyring.removePair(address);
    await this._store.remove(this.toHex(address));
    delete this.#accounts[address];
  }

  public getAccounts(): KeyringAddress[] {
    return Object.keys(this.#accounts)
      .map((address) => this.getAddress(address))
      .filter((account): account is KeyringAddress => !!account);
  }

  public async restoreAccount(
    json: KeyringPair$Json,
    password: string,
  ): Promise<KeyringPair> {
    const cryptoType = Array.isArray(json.encoding.content)
      ? json.encoding.content[1]
      : 'sr25519';
    const encType = Array.isArray(json.encoding.type)
      ? json.encoding.type
      : [json.encoding.type];
    const pair = createPair(
      { toSS58: this.encodeAddress, type: cryptoType as KeypairType },
      { publicKey: decodeAddress(json.address, true) },
      json.meta,
      isHex(json.encoded) ? hexToU8a(json.encoded) : base64Decode(json.encoded),
      encType,
    );

    // Unlock the account
    pair.decodePkcs8(password);

    await this.addPair(pair);

    return pair;
  }

  public async restoreAccounts(
    json: EncryptedJson,
    password: string,
  ): Promise<void> {
    const accounts: KeyringJson[] = JSON.parse(
      u8aToString(jsonDecrypt(json, password)),
    ) as KeyringJson[];

    for (const account of accounts) {
      const pair = this.keyring.addFromJson(account as KeyringPair$Json, true);
      this.#accounts[pair.address] = account;
      this.saveAccount(pair);
    }
  }

  public async saveAccountMeta(
    pair: KeyringPair,
    meta: KeyringPair$Meta,
  ): Promise<boolean> {
    const address = pair.address;

    const json = await this._store.get(this.toHex(address));
    if (!json) return false;

    pair.setMeta(meta);
    json.meta = pair.meta;

    await this._store.set(this.toHex(pair.address), json);
    this.#accounts[pair.address] = json;

    return true;
  }

  // *************** Private methods ***************

  private initKeyring(): void {
    const keyring = new BaseKeyring();
    this.#keyring = keyring;
  }

  private addTimestamp(pair: KeyringPair): void {
    if (!pair.meta.whenCreated) {
      pair.setMeta({ whenCreated: Date.now() });
    }
  }

  private encodeAddress = (
    key: string | Uint8Array,
    ss58Format?: Prefix,
  ): string => {
    return this.keyring.encodeAddress(key, ss58Format);
  };

  private loadAccount(json: KeyringJson, key?: string): void {
    if ((json as KeyringPair$Json).encoded) {
      const pair = this.keyring.addFromJson(json as KeyringPair$Json, true);
      this.#accounts[pair.address] = json;
    }
  }

  private toHex(address: string): string {
    return u8aToHex(decodeAddress(address, true));
  }

  private getAddress(
    _address: string | Uint8Array,
  ): KeyringAddress | undefined {
    const address = isString(_address)
      ? _address
      : this.keyring.encodeAddress(_address);
    const publicKey = this.keyring.decodeAddress(address);
    const keyringJson = this.#accounts[address];

    return (
      keyringJson && {
        address,
        meta: keyringJson.meta,
        publicKey,
      }
    );
  }

  public async saveAccount(pair: KeyringPair): Promise<KeyringPair$Json> {
    this.addTimestamp(pair);

    const json = pair.toJson();

    this.keyring.addFromJson(json);
    await this._store.set(this.toHex(pair.address), json);
    this.#accounts[pair.address] = json;

    return json;
  }
}
