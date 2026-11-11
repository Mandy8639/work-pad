import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LibraryScreen } from "@/components/library-screen";
import { sql } from "@/lib/db";
import { personFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookie = (await cookies()).toString();
  const person = await personFromRequest(sql, new Request("http://folio.local", { headers: { cookie } }));
  if (!person) redirect("/login");
  return <LibraryScreen />;
}
