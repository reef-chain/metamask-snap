import BaseStore from './Base';
import { KeyringJson } from '../types';

export class AccountsStore extends BaseStore<KeyringJson> {
  constructor() {
    super('account');
  }
}
