import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireAuth, canManageUsers } from "@/lib/api/auth";
import { UsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const user = await requireAuth();
  if (!canManageUsers(user)) {
    redirect("/dashboard");
  }

  return <UsersTable />;
}
