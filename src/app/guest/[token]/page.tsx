import { GuestJoin } from "@/components/guest-join";
export const dynamic="force-dynamic";
export default async function GuestInvitePage({params}:{params:Promise<{token:string}>}){const {token}=await params;if(!/^[A-Za-z0-9_-]{43}$/.test(token))return <main className="auth-shell"><section className="auth-card"><h1>Ungültiger Gastlink</h1><p>Bitte lass dir einen neuen QR-Code erstellen.</p></section></main>;return <GuestJoin token={token}/>;}
