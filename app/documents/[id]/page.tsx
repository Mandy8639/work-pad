import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EditorScreen } from "@/components/editor-screen";
import { sql } from "@/lib/db";
import { personFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const cookie = (await cookies()).toString();
  const person = await personFromRequest(sql, new Request("http://folio.local", { headers: { cookie } }));
  if (!person) redirect("/login");
  const { id } = await params;
  return <EditorScreen documentId={id} />;
}
