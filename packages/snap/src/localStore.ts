import { ManageStateResult } from '@metamask/snaps-sdk';
import { KeyringJson, KeyringStore } from '@polkadot/ui-keyring/types';

export class LocalStore implements KeyringStore {
  public all(fn: (key: string, value: KeyringJson) => void): void {
    snap
      .request({
        method: 'snap_manageState',
        params: { operation: 'get' },
      })
      .then((result: ManageStateResult) => {
        Object.entries(result || {}).forEach(([key, value]) => {
          if (value) fn(key, value as unknown as KeyringJson);
        });
      });
  }

  public get(key: string, fn: (value: KeyringJson) => void): void {
    snap
      .request({
        method: 'snap_manageState',
        params: { operation: 'get' },
      })
      .then((result: ManageStateResult) => {
        console.log('result', result);
        if (result && result[key]) {
          fn(result[key] as unknown as KeyringJson);
        }
      });
  }

  public remove(key: string, fn?: () => void): void {
    snap
      .request({
        method: 'snap_manageState',
        params: {
          operation: 'update',
          newState: { [key]: null },
        },
      })
      .then((_result: ManageStateResult) => {
        fn && fn();
      });
  }

  public set(key: string, value: KeyringJson, fn?: () => void): void {
    snap
      .request({
        method: 'snap_manageState',
        params: {
          operation: 'update',
          newState: { [key]: JSON.parse(JSON.stringify(value)) },
        },
      })
      .then((_result: ManageStateResult) => {
        fn && fn();
      });
  }
}
