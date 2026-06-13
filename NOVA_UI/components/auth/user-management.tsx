"use client";

import { LoaderCircle, ShieldCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { PageIntro } from "@/components/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { clearAuthSession, getStoredAuthUser } from "@/lib/auth";
import {
  createUser,
  getApiErrorMessage,
  listUsers,
  transferAdmin,
  updateUser,
} from "@/lib/api";
import type { AuthUser, UserDraft } from "@/types";

type UserFormState = UserDraft;

const emptyForm: UserFormState = {
  loginName: "",
  displayName: "",
  password: "",
  isActive: true,
};

function formFromUser(user: AuthUser): UserFormState {
  return {
    loginName: user.loginName,
    displayName: user.displayName ?? "",
    password: user.password ?? "",
    isActive: user.isActive ?? true,
  };
}

export function UserManagement() {
  const router = useRouter();
  const currentUser = getStoredAuthUser();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const selectedUser = useMemo(
    () => users.find((user) => user.userId === selectedUserId),
    [selectedUserId, users],
  );

  useEffect(() => {
    const controller = new AbortController();

    listUsers({ signal: controller.signal })
      .then((nextUsers) => {
        setUsers(nextUsers);
        setErrorMessage("");
      })
      .catch((error) => {
        setErrorMessage(getApiErrorMessage(error));
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const resetForm = () => {
    setSelectedUserId(null);
    setForm(emptyForm);
    setErrorMessage("");
  };

  const selectUser = (user: AuthUser) => {
    setSelectedUserId(user.userId);
    setForm(formFromUser(user));
    setErrorMessage("");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    startTransition(async () => {
      try {
        const savedUser = selectedUserId
          ? await updateUser(selectedUserId, form)
          : await createUser(form);

        setUsers((currentUsers) => {
          const withoutSavedUser = currentUsers.filter(
            (user) => user.userId !== savedUser.userId,
          );
          return [...withoutSavedUser, savedUser].sort((a, b) => {
            if (a.isHomeAdmin !== b.isHomeAdmin) {
              return a.isHomeAdmin ? -1 : 1;
            }
            return a.loginName.localeCompare(b.loginName);
          });
        });
        setSelectedUserId(savedUser.userId);
        setForm(formFromUser(savedUser));
        toast.success(selectedUserId ? "User updated." : "User created.");
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      }
    });
  };

  const handleTransferAdmin = (user: AuthUser) => {
    setErrorMessage("");

    startTransition(async () => {
      try {
        await transferAdmin(user.userId);
        toast.success("Admin transferred. Log in as the new admin to keep managing users.");
        clearAuthSession();
        router.replace("/auth/login");
        router.refresh();
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      }
    });
  };

  if (!currentUser?.isHomeAdmin) {
    return (
      <section className="space-y-5">
        <PageIntro
          eyebrow="Admin"
          title="User management is admin-only."
          description="Use an admin account to create users, manage codes, and transfer admin access."
        />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageIntro
        eyebrow="Admin"
        title="Manage home users."
        description="Create users, update names, set or disable codes, and transfer admin access for this home."
      />

      {errorMessage ? (
        <div className="rounded-[1.25rem] border border-destructive/15 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading users
            </div>
          ) : null}

          {users.map((user) => (
            <Card key={user.userId} className="overflow-hidden">
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">
                      {user.displayName || user.loginName}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {user.loginName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.isHomeAdmin ? (
                      <Badge className="bg-accent text-accent-foreground">
                        Admin
                      </Badge>
                    ) : null}
                    <Badge
                      className={
                        user.isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1rem] border border-border bg-white/70 px-3 py-2 text-sm">
                  <span className="font-semibold text-foreground">Code: </span>
                  <span className="text-muted-foreground">
                    {user.password ?? "Disabled"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => selectUser(user)}
                  >
                    Edit
                  </Button>
                  {!user.isHomeAdmin && user.isActive ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleTransferAdmin(user)}
                      disabled={isPending}
                    >
                      <ShieldCheck className="size-4" />
                      Make admin
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{selectedUser ? "Edit user" : "Create user"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">Name</span>
                <Input
                  autoComplete="username"
                  value={form.loginName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      loginName: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">
                  Display name
                </span>
                <Input
                  autoComplete="name"
                  value={form.displayName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-foreground">
                  Pass phrase or code
                </span>
                <Input
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Blank disables the code"
                />
              </label>

              <label className="flex items-center gap-3 text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  disabled={selectedUser?.userId === currentUser.userId}
                  className="size-4"
                />
                Active user
              </label>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Saving
                    </>
                  ) : (
                    <>
                      <UserPlus className="size-4" />
                      {selectedUser ? "Save user" : "Create user"}
                    </>
                  )}
                </Button>
                {selectedUser ? (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    New user
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
