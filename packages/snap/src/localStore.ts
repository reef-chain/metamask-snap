import { ManageStateResult } from '@metamask/snaps-sdk';
import { KeyringJson, KeyringStore } from '@polkadot/ui-keyring/types';

// TODO: remove

const ENCRYPTED_STORAGE = true; // TODO

export class LocalStore implements KeyringStore {
  private state: ManageStateResult = {};

  public all(fn: (key: string, value: KeyringJson) => void): void {
    console.log('LocalStore.all');
    // const result = await snap.request({
    //   method: 'snap_manageState',
    //   params: { operation: 'get', encrypted: ENCRYPTED_STORAGE },
    // });
    // console.log('LocalStore.all result', result);

    snap
      .request({
        method: 'snap_manageState',
        params: { operation: 'get', encrypted: ENCRYPTED_STORAGE },
      })
      .then((result) => {
        console.log('LocalStore.all result', result);
        this.state = result || {};
        Object.entries(result || {}).forEach(([key, value]) => {
          if (value && fn) fn(key, value as unknown as KeyringJson);
        });
      });
  }

  public get(key: string, fn: (value: KeyringJson) => void): void {
    console.log('LocalStore.get', key);
    snap
      .request({
        method: 'snap_manageState',
        params: { operation: 'get', encrypted: ENCRYPTED_STORAGE },
      })
      .then((result) => {
        console.log('LocalStore.get result', result);

        if (result && result[key] && fn) {
          fn(result[key] as unknown as KeyringJson);
        }
      });
  }

  public remove(key: string, fn?: () => void): void {
    console.log('LocalStore.remove', key);
    if (!this.state) return;

    const newState = { ...this.state };
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
        console.log('LocalStore.remove result', result);
        this.state = newState;
        fn && fn();
      });
  }

  public set(key: string, value: KeyringJson, fn?: () => void): void {
    console.log('LocalStore.set', key);
    const newState = {
      ...this.state,
      [key]: JSON.parse(JSON.stringify(value)),
    };
    console.log('LocalStore.set current state', this.state);

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
        console.log('LocalStore.set result', result);
        this.state = newState;
        fn && fn();
      });
  }
}
