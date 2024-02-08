import BaseStore from './Base';

export class PreferencesStore extends BaseStore<any> {
  constructor() {
    super('preferences');
  }
}
