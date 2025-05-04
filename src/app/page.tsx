import { redirect } from 'next/navigation';

export default function RootPage() {
  // For now, redirect root to login. Later, this could check auth status.
  redirect('/login');
}
