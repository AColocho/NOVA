import { UserManagement } from "@/components/auth/user-management";

export const metadata = {
  title: "Users",
};

export default function UsersPage() {
  return (
    <main className="flex flex-1 flex-col">
      <UserManagement />
    </main>
  );
}
