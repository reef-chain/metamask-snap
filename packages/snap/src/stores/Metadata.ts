import BaseStore from './Base';
import type { MetadataDef } from '../types';

export default class MetadataStore extends BaseStore<MetadataDef> {
  constructor() {
    super('metadata');
  }
}
