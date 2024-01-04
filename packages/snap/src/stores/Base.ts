// Copyright 2019-2021 @polkadot/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ManageStateResult } from '@metamask/snaps-sdk';

const ENCRYPTED_STORAGE = true; // TODO

export default abstract class BaseStore<T> {
  #prefix: string;
  #state: ManageStateResult = {};

  constructor(prefix: string | null) {
    this.#prefix = prefix ? `${prefix}:` : '';
  }

  public all(update: (key: string, value: T) => void): void {
    console.log('Store.all', this.#prefix);

    snap
      .request({
        method: 'snap_manageState',
        params: { operation: 'get', encrypted: ENCRYPTED_STORAGE },
      })
      .then((result) => {
        console.log('Store.all result', result);
        this.#state = result || {};
        Object.entries(result || {})
          .filter(([key]) => key.startsWith(this.#prefix))
          .forEach(([key, value]) => {
            update(key.replace(this.#prefix, ''), value as T);
          });
      });
  }

  public get(_key: string, update: (value: T) => void): void {
    const key = `${this.#prefix}${_key}`;
    console.log('Store.get', key);

    snap
      .request({
        method: 'snap_manageState',
        params: { operation: 'get', encrypted: ENCRYPTED_STORAGE },
      })
      .then((result) => {
        console.log('Store.get result', result);
        if (result) {
          update(result[key] as T);
        }
      });
  }

  public remove(_key: string, update?: () => void): void {
    const key = `${this.#prefix}${_key}`;
    console.log('Store.remove', key);

    // snap
    //   .request({
    //     method: 'snap_manageState',
    //     params: { operation: 'get', encrypted: ENCRYPTED_STORAGE },
    //   })
    //   .then((state) => {
    //     if (!state) return;

    //     delete state[key];

    //     snap
    //       .request({
    //         method: 'snap_manageState',
    //         params: {
    //           operation: 'update',
    //           newState: { ...state },
    //           encrypted: ENCRYPTED_STORAGE,
    //         },
    //       })
    //       .then((result) => {
    //         console.log('Store.remove result', result);
    //         update && update();
    //       });
    //   });

    if (!this.#state) return;

    const newState = { ...this.#state };
    delete newState[key];

    snap
      .request({
        method: 'snap_manageState',
        params: {
          operation: 'update',
          newState: newState,
          encrypted: ENCRYPTED_STORAGE,
        },
      })
      .then((result) => {
        console.log('Store.remove result', result);
        update && update();
      });

    // TODO: check why this is not executed in the then block above
    this.#state = newState;
  }

  public set(_key: string, value: T, update?: () => void): void {
    const key = `${this.#prefix}${_key}`;
    console.log('Store.set', key);

    // snap
    //   .request({
    //     method: 'snap_manageState',
    //     params: { operation: 'get', encrypted: ENCRYPTED_STORAGE },
    //   })
    //   .then((result) => {
    //     console.log('Store.set current', result);
    //     snap
    //       .request({
    //         method: 'snap_manageState',
    //         params: {
    //           operation: 'update',
    //           newState: { ...result, [key]: JSON.parse(JSON.stringify(value)) },
    //           encrypted: ENCRYPTED_STORAGE,
    //         },
    //       })
    //       .then((result) => {
    //         console.log('Store.set result', result);
    //         update && update();
    //       });
    //   });

    const newState = {
      ...this.#state,
      [key]: JSON.parse(JSON.stringify(value)),
    };
    console.log('Store.set current state', this.#state);

    snap
      .request({
        method: 'snap_manageState',
        params: {
          operation: 'update',
          newState: newState,
          encrypted: ENCRYPTED_STORAGE,
        },
      })
      .then((result) => {
        console.log('Store.set result', result);
        update && update();
      });

    // TODO: check why this is not executed in the then block above
    this.#state = newState;
  }
}
