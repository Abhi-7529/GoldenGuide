"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { ROLE_LABELS } from "~/lib/roles";
import { createClient } from "~/lib/supabase/client";
import type { AdminUser } from "~/lib/types";

const roleLabels: Record<string, string> = ROLE_LABELS;

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Never";
}

export function UsersTable({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = users.filter((u) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      u.email.toLowerCase().includes(q) ||
      (u.full_name ?? "").toLowerCase().includes(q);
    const matchesFilter =
      filter === "all" ||
      (filter === "admin" && u.is_admin_user) ||
      (filter === "none" && !u.role) ||
      u.role === filter;
    return matchesQuery && matchesFilter;
  });

  async function run(
    userId: string,
    action: () => PromiseLike<{ error: { message: string } | null }>,
  ) {
    setBusyId(userId);
    setError(null);
    const { error: rpcError } = await action();
    setBusyId(null);
    if (rpcError) {
      setError(rpcError.message);
      return false;
    }
    router.refresh();
    return true;
  }

  async function saveName(userId: string) {
    const supabase = createClient();
    const ok = await run(userId, () =>
      supabase.rpc("admin_update_user_name", {
        p_user_id: userId,
        p_full_name: editName,
      }),
    );
    if (ok) setEditingId(null);
  }

  async function toggleAdmin(user: AdminUser) {
    const supabase = createClient();
    await run(user.user_id, () =>
      supabase.rpc("admin_set_admin", {
        p_user_id: user.user_id,
        p_make_admin: !user.is_admin_user,
      }),
    );
  }

  async function deleteUser(userId: string) {
    const supabase = createClient();
    const ok = await run(userId, () =>
      supabase.rpc("admin_delete_user", { p_user_id: userId }),
    );
    if (ok) setConfirmDeleteId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          aria-label="Search users"
        />
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter users"
          className="sm:w-48"
        >
          <option value="all">All users</option>
          <option value="care_recipient">Learners</option>
          <option value="student">Students</option>
          <option value="caregiver">Caregivers</option>
          <option value="admin">Admins</option>
          <option value="none">Setup incomplete</option>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <p className="text-sm text-muted-foreground">
        Showing {visible.length} of {users.length} users
      </p>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No users match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((u) => {
            const isSelf = u.user_id === currentUserId;
            const busy = busyId === u.user_id;
            return (
              <Card key={u.user_id}>
                <CardContent className="flex flex-col gap-3 py-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      {editingId === u.user_id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            aria-label="Full name"
                            className="w-56"
                          />
                          <Button
                            size="sm"
                            disabled={busy || !editName.trim()}
                            onClick={() => saveName(u.user_id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <p className="font-semibold">
                          {u.full_name || "No name yet"}
                          {isSelf && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              (you)
                            </span>
                          )}
                        </p>
                      )}
                      <p className="truncate text-sm text-muted-foreground">
                        {u.email}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={u.role ? "secondary" : "outline"}>
                        {u.role ? roleLabels[u.role] : "Setup incomplete"}
                      </Badge>
                      {u.is_admin_user && <Badge>Admin</Badge>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Joined {formatDate(u.created_at)} · Last active{" "}
                      {formatDate(u.last_sign_in_at)} · {u.linked_count} linked
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {u.role && editingId !== u.user_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(u.user_id);
                            setEditName(u.full_name ?? "");
                          }}
                        >
                          Edit name
                        </Button>
                      )}
                      {!isSelf && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => toggleAdmin(u)}
                        >
                          {u.is_admin_user ? "Remove admin" : "Make admin"}
                        </Button>
                      )}
                      {!isSelf &&
                        !u.is_admin_user &&
                        (confirmDeleteId === u.user_id ? (
                          <>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={busy}
                              onClick={() => deleteUser(u.user_id)}
                            >
                              Confirm delete
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDeleteId(u.user_id)}
                          >
                            Delete
                          </Button>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
