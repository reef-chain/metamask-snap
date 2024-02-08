// Copyright 2019-2021 @polkadot/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Json } from '@metamask/snaps-sdk';

const ENCRYPTED_STORAGE = true;

export default abstract class BaseStore<T> {
  #prefix: string;

  constructor(prefix: string | null) {
    this.#prefix = prefix ? `${prefix}:` : '';
  }

  public async all(): Promise<T[]> {
    const result = await snap.request({
      method: 'snap_manageState',
      params: { operation: 'get', encrypted: ENCRYPTED_STORAGE },
    });

    return Object.entries(result || {})
      .filter(([key]) => key.startsWith(this.#prefix))
      .map(([_key, value]) => {
        return value as T;
      });
  }

  public async get(_key: string): Promise<T | undefined> {
    const key = `${this.#prefix}${_key}`;

    const result = await snap.request({
      method: 'snap_manageState',
      params: { operation: 'get', encrypted: ENCRYPTED_STORAGE },
    });
    return result ? (result[key] as T) : undefined;
  }

  public async set(_key: string, value: T): Promise<void> {
    const key = `${this.#prefix}${_key}`;

    const state = await snap.request({
      method: 'snap_manageState',
      params: { operation: 'get', encrypted: ENCRYPTED_STORAGE },
    });

    await snap.request({
      method: 'snap_manageState',
      params: {
        operation: 'update',
        newState: { ...state, [key]: JSON.parse(JSON.stringify(value)) },
        encrypted: ENCRYPTED_STORAGE,
      },
    });
    console.log('Store.set done');
  }

  public async setBulk(record: Record<string, T>): Promise<void> {
    const keys = Object.keys(record).map((key) => `${this.#prefix}${key}`);
    const values = Object.values(record);

    const newRecord = Object.fromEntries(
      keys.map((key, index) => [
        key,
        JSON.parse(JSON.stringify(values[index])) as Json,
      ]),
    );

    const state = await snap.request({
      method: 'snap_manageState',
      params: { operation: 'get', encrypted: ENCRYPTED_STORAGE },
    });

    await snap.request({
      method: 'snap_manageState',
      params: {
        operation: 'update',
        newState: { ...state, ...newRecord },
        encrypted: ENCRYPTED_STORAGE,
      },
    });
    console.log('Store.setBulk done');
  }

  public async remove(_key: string): Promise<void> {
    const key = `${this.#prefix}${_key}`;

    const state = await snap.request({
      method: 'snap_manageState',
      params: { operation: 'get', encrypted: ENCRYPTED_STORAGE },
    });
    if (!state) return;

    delete state[key];

    await snap.request({
      method: 'snap_manageState',
      params: {
        operation: 'update',
        newState: { ...state },
        encrypted: ENCRYPTED_STORAGE,
      },
    });
    console.log('Store.remove done');
  }

  public async clear(): Promise<void> {
    await snap.request({
      method: 'snap_manageState',
      params: { operation: 'clear', encrypted: ENCRYPTED_STORAGE },
    });
    console.log('Store.clear done');
  }
}
