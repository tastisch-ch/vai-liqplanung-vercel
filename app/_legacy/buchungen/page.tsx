import { redirect } from 'next/navigation';

export default function BuchungenLegacyPage() {
  redirect('/transaktionen');
  return null;
} 