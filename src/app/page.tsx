import { SendWizard } from '@/components/customer/send-wizard'
// Every route here sits behind the login gate in src/proxy.ts — force dynamic rendering so
// Vercel's CDN never caches and serves this page without the proxy re-checking the session.
export const dynamic = 'force-dynamic'
export default function Home(){return <SendWizard/>}
