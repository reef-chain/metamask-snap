import BaseStore from './Base';
import type { MetadataDef } from '../types';

export class MetadataStore extends BaseStore<MetadataDef> {
  constructor() {
    super('metadata');
  }
}
