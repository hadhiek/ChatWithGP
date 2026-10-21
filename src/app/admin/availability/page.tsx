import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AvailabilityClient from "./AvailabilityClient";

// This route must never render the management UI without an authenticated PoP session.
export default async function ProfessorAvailabilityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "PROFESSOR") redirect("/");

  return <AvailabilityClient />;
}
