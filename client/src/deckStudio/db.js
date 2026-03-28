import Dexie from 'dexie';

class LocalFluxDeckStudioDB extends Dexie {
  constructor() {
    super('localflux_deck_studio');
    this.version(1).stores({
      drafts: '&id, updatedAt',
    });
  }
}

export const deckStudioDB = new LocalFluxDeckStudioDB();

export async function saveDraft(deck) {
  await deckStudioDB.drafts.put(deck);
}

export async function loadDraft(id) {
  return deckStudioDB.drafts.get(id);
}

export async function listDrafts() {
  return deckStudioDB.drafts.orderBy('updatedAt').reverse().toArray();
}
