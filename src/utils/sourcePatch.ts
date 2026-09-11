import { 
  INITIAL_DONATIONS, 
  INITIAL_BENEFICIARIES, 
  INITIAL_MEMBERS, 
  INITIAL_USERS 
} from '../data/initialData';
import { NEW_DONATIONS } from '../data/new_donations';

// Create a Set of all IDs that are considered "Audit" records
// We use a lazy-initialized Set to avoid heavy computation on module load
let auditIdsSet: Set<string> | null = null;

function getAuditIdsSet(): Set<string> {
  if (!auditIdsSet) {
    auditIdsSet = new Set([
      ...INITIAL_DONATIONS.map(d => d.id),
      ...INITIAL_BENEFICIARIES.map(b => b.id),
      ...INITIAL_MEMBERS.map(m => m.id),
      ...INITIAL_USERS.map(u => u.id),
      ...NEW_DONATIONS.map(d => d.id)
    ]);
  }
  return auditIdsSet;
}

/**
 * Patches a record with the 'Source' field if it's missing.
 * This allows the app to function even if the database schema 
 * hasn't been updated with a 'Source' column yet.
 */
export const patchSource = <T extends { id: string, Source?: string }>(item: T): T => {
  if (item && !item.Source) {
    const isAudit = getAuditIdsSet().has(item.id);
    item.Source = isAudit ? 'Audit' : 'Live';
  }
  return item;
};
