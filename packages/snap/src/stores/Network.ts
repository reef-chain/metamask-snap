import BaseStore from './Base';
import type { NetworkName } from '../networks';

export default class NetworkStore extends BaseStore<NetworkName> {
  constructor() {
    super('network');
  }
}
