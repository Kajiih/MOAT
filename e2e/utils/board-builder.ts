import { MusicBrainzProvider } from '../../src/infra/providers/adapters/musicbrainz';
import { RAWGProvider } from '../../src/infra/providers/adapters/rawg';
import { TMDBProvider } from '../../src/infra/providers/adapters/tmdb';

export type KnownProviders = {
  rawg: typeof RAWGProvider.prototype.entities[number]['id'];
  musicbrainz: typeof MusicBrainzProvider.prototype.entities[number]['id'];
  tmdb: typeof TMDBProvider.prototype.entities[number]['id'];
};

export class TestItemBuilder {
  private item: any = {
    id: '',
    identity: { providerId: '', entityId: '', providerItemId: '' },
    title: ''
  };

  constructor(providerId: string, entityId: string, providerItemId: string) {
    this.item.identity = { providerId, entityId, providerItemId };
    this.item.id = `${providerId}:${entityId}:${providerItemId}`;
  }

  static create<P extends keyof KnownProviders>(
    providerId: P,
    entityId: KnownProviders[P],
    id: string
  ) {
    return new TestItemBuilder(providerId, entityId, id);
  }

  withTitle(title: string) {
    this.item.title = title;
    return this;
  }

  withImages(images: any[]) {
    this.item.images = images;
    return this;
  }

  withReferenceImage(key: string) {
    this.item.images = [
      {
        type: 'reference',
        provider: this.item.identity.providerId,
        entityId: this.item.identity.entityId,
        key: key
      }
    ];
    return this;
  }

  build() {
    return this.item;
  }
}

export class TestBoardBuilder {
  private board: any = {
    version: 2,
    createdAt: new Date().toISOString(),
    title: 'Default Board',
    tiers: [],
    uncategorizedItems: []
  };

  withTitle(title: string) {
    this.board.title = title;
    return this;
  }

  addTier(label: string, color: string, items: (any | TestItemBuilder)[] = []) {
    this.board.tiers.push({
      label,
      color,
      items: items.map(item => item instanceof TestItemBuilder ? item.build() : item)
    });
    return this;
  }

  build() {
    return this.board;
  }
}
