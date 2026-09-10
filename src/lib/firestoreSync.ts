import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Donation,
  Beneficiary,
  Member,
  UserAccount,
  PortalSettings
} from '../types';

// Helper function to strip all undefined values before sending to Firestore
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    if (Array.isArray(data)) {
      return data.map(sanitizeForFirestore) as any;
    }
    if (typeof data === 'object' && !(data instanceof Date)) {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          cleaned[key] = sanitizeForFirestore(value);
        }
      }
      return cleaned;
    }
    return data;
  }
}

// Real-time collection subscriptions
export function subscribeCollection<T extends { id: string }>(
  collectionName: string,
  onData: (data: T[]) => void,
  initialDataIfEmpty?: T[]
): () => void {
  const colRef = collection(db, collectionName);

  const unsubscribe = onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty && initialDataIfEmpty && initialDataIfEmpty.length > 0) {
        // Seed initial data if collection is brand new
        const batch = writeBatch(db);
        initialDataIfEmpty.forEach((item) => {
          const itemRef = doc(db, collectionName, item.id);
          batch.set(itemRef, sanitizeForFirestore(item));
        });
        await batch.commit().catch(console.error);
        return;
      }

      const existingIds = new Set<string>();
      let rawItems: T[] = [];
      const batch = writeBatch(db);
      let batchNeedsCommit = false;

      snapshot.forEach((docSnap) => {
        existingIds.add(docSnap.id);
        const data = docSnap.data() as any;
        const id = docSnap.id;

        // Check for erroneous summary rows saved as individual records in donations
        if (collectionName === 'donations') {
          const name = (data['Donor Name'] || '').toString().toLowerCase();
          const amount = Number(data.Amount) || 0;
          if (
            name.includes('direct financial') ||
            name.includes('beneficiar') ||
            name.includes('wheelchair donation') ||
            name.includes('total collection') ||
            name.includes('total donation') ||
            name.includes('distributed amount') ||
            amount === 1151497 ||
            amount === 5569866 ||
            amount === 4309798
          ) {
            batch.delete(docSnap.ref);
            batchNeedsCommit = true;
            return;
          }
        }

        // Check for erroneous summary rows saved as individual records in beneficiaries
        if (collectionName === 'beneficiaries') {
          const name = (data['Beneficiary Name'] || '').toString().toLowerCase();
          const amount = Number(data.Amount) || 0;
          if (
            name.includes('total collection') ||
            name.includes('total donation') ||
            name.includes('master collection') ||
            amount === 5569866
          ) {
            batch.delete(docSnap.ref);
            batchNeedsCommit = true;
            return;
          }
        }

        rawItems.push({ id: docSnap.id, ...data } as T);
      });

      const items: T[] = rawItems;

      if (initialDataIfEmpty && initialDataIfEmpty.length > 0) {
        const initialMap = new Map(initialDataIfEmpty.map((i) => [i.id, i]));
        const batch = writeBatch(db);
        let batchNeedsCommit = false;

        const missing = initialDataIfEmpty.filter((item) => !existingIds.has(item.id));
        if (missing.length > 0) {
          missing.forEach((item) => {
            const itemRef = doc(db, collectionName, item.id);
            batch.set(itemRef, sanitizeForFirestore(item), { merge: true });
            items.push(item);
          });
          batchNeedsCommit = true;
        }

        // Check if any known seed item needs amount/data refresh (e.g. dis-1 to dis-7)
        items.forEach((item, idx) => {
          const seed = initialMap.get(item.id);
          if (seed && item.id.startsWith('dis-')) {
            const currentAny = item as any;
            const seedAny = seed as any;
            if (currentAny.Amount !== seedAny.Amount || currentAny['Beneficiary Name'] !== seedAny['Beneficiary Name']) {
              const merged = { ...item, ...seed };
              items[idx] = merged;
              const itemRef = doc(db, collectionName, item.id);
              batch.set(itemRef, sanitizeForFirestore(merged), { merge: true });
              batchNeedsCommit = true;
            }
          }
        });

        if (batchNeedsCommit) {
          batch.commit().catch(console.error);
        }
      }

      onData(items);
    },
    (err) => {
      console.error(`Error subscribing to ${collectionName}:`, err);
    }
  );

  return unsubscribe;
}

// Single document subscription (e.g. settings)
export function subscribeDocument<T>(
  collectionName: string,
  docId: string,
  onData: (data: T) => void,
  initialDataIfEmpty?: T
): () => void {
  const docRef = doc(db, collectionName, docId);

  const unsubscribe = onSnapshot(
    docRef,
    async (docSnap) => {
      if (!docSnap.exists() && initialDataIfEmpty) {
        await setDoc(docRef, sanitizeForFirestore(initialDataIfEmpty) as any).catch(console.error);
        return;
      }
      if (docSnap.exists()) {
        onData(docSnap.data() as T);
      }
    },
    (err) => {
      console.error(`Error subscribing to ${collectionName}/${docId}:`, err);
    }
  );

  return unsubscribe;
}

// Helper methods to write data to Firestore
export async function saveToFirestore<T extends { id: string }>(
  collectionName: string,
  item: T
) {
  try {
    const docRef = doc(db, collectionName, item.id);
    const sanitized = sanitizeForFirestore(item);
    console.log(`Saving to Firestore [${collectionName}]:`, sanitized);
    await setDoc(docRef, sanitized, { merge: true });
    console.log(`Successfully saved to Firestore [${collectionName}]`);
  } catch (err) {
    console.error(`Failed to save to Firestore [${collectionName}]:`, err);
    throw err; // Re-throw to be caught by the caller
  }
}

export async function deleteFromFirestore(collectionName: string, id: string) {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Failed to delete from Firestore [${collectionName}]:`, err);
  }
}

export async function saveDocToFirestore<T>(
  collectionName: string,
  docId: string,
  data: T
) {
  try {
    const docRef = doc(db, collectionName, docId);
    const sanitized = sanitizeForFirestore(data);
    await setDoc(docRef, sanitized as any, { merge: true });
  } catch (err) {
    console.error(`Failed to save doc to Firestore [${collectionName}/${docId}]:`, err);
  }
}
