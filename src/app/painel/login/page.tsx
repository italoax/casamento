import { redirect } from "next/navigation";
import { getPainelSession } from "@/lib/painel-auth";
import PainelLoginClient from "./PainelLoginClient";
import "./painel-login.css";

export const dynamic = "force-dynamic";

export default async function LoginPainelPage() {
  const session = await getPainelSession();
  if (session) redirect("/painel");
  return <PainelLoginClient />;
}
