import { redirect } from 'next/navigation';

/** Legacy blue prototype — Chat is home. */
export default function HomeAliasPage() {
  redirect('/research');
}
