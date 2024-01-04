import { ManageStateResult } from '@metamask/snaps-sdk';
import { KeyringJson } from '@polkadot/ui-keyring/types';

// TODO: remove

const ENCRYPTED_STORAGE = false; // TODO

export class LocalStoreTest {
  public async all(): Promise<ManageStateResult> {
    console.log('LocalStoreTest.all');
    const result = await snap.request({
      method: 'snap_manageState',
      params: { operation: 'get', encrypted: ENCRYPTED_STORAGE },
    });
    console.log('LocalStore.all result', result);
    return result;
  }

  public async get(key: string): Promise<KeyringJson | undefined> {
    console.log('LocalStoreTest.get', key);
    const result = await snap.request({
      method: 'snap_manageState',
      params: { operation: 'get', encrypted: ENCRYPTED_STORAGE },
    });

    if (!result || !result[key]) return undefined;
    console.log('LocalStoreTest.get result', result);

    return result[key] as unknown as KeyringJson;
  }

  public async remove(key: string): Promise<ManageStateResult> {
    console.log('LocalStoreTest.remove', key);
    let state = await this.all();
    if (state) delete state[key];
    return snap.request({
      method: 'snap_manageState',
      params: {
        operation: 'update',
        newState: { ...state },
        encrypted: ENCRYPTED_STORAGE,
      },
    });
  }

  public clear(): Promise<ManageStateResult> {
    console.log('LocalStoreTest.clear');
    return snap.request({
      method: 'snap_manageState',
      params: {
        operation: 'clear',
        encrypted: ENCRYPTED_STORAGE,
      },
    });
  }

  public async set(
    key: string,
    value: KeyringJson,
  ): Promise<ManageStateResult[]> {
    console.log('LocalStoreTest.set', key);

    const oldState = await this.currentState();
    console.log('LocalStoreTest.set oldState', oldState);

    const result = await snap.request({
      method: 'snap_manageState',
      params: {
        operation: 'update',
        newState: { ...oldState, [key]: JSON.parse(JSON.stringify(value)) },
        encrypted: ENCRYPTED_STORAGE,
      },
    });
    console.log('LocalStoreTest.set result', result);

    const newState = await this.all();
    console.log('LocalStoreTest.set result', newState);
    return [oldState, newState];
  }

  private currentState(): Promise<ManageStateResult> {
    console.log('LocalStoreTest.currentState');
    return snap.request({
      method: 'snap_manageState',
      params: { operation: 'get', encrypted: ENCRYPTED_STORAGE },
    });
  }
}
