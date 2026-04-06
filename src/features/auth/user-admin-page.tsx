import { useEffect, useState } from "react";
import { Shield, UserCog } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { LoadingState } from "@/components/app/loading-state";
import { EmptyState, ErrorState } from "@/components/app/states";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/auth-context";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types/database";

const userSchema = z.object({
  display_name: z.string().trim().min(1, "表示名を入力してください").max(50, "50文字以内で入力してください"),
  is_master: z.boolean(),
});

type UserFormValues = z.infer<typeof userSchema>;

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

export function UserAdminPage() {
  const { isMaster } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      display_name: "",
      is_master: false,
    },
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: nextError } = await supabase.from("app_users").select("*").order("created_at", { ascending: true });
      if (nextError) {
        throw nextError;
      }
      setUsers((data ?? []) as AppUser[]);
    } catch (nextError) {
      setError(getErrorMessage(nextError, "アカウント一覧の取得に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isMaster) {
      setLoading(false);
      return;
    }
    void load();
  }, [isMaster]);

  const openEdit = (user: AppUser) => {
    setEditingUser(user);
    form.reset({
      display_name: user.display_name ?? "",
      is_master: user.is_master,
    });
    setOpen(true);
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!editingUser) {
      return;
    }

    setSaving(true);
    try {
      const { error: nextError } = await supabase
        .from("app_users")
        .update({
          display_name: values.display_name,
          is_master: values.is_master,
        })
        .eq("user_id", editingUser.user_id);

      if (nextError) {
        throw nextError;
      }

      toast.success("アカウント情報を更新しました");
      setOpen(false);
      setEditingUser(null);
      await load();
    } catch (nextError) {
      toast.error(getErrorMessage(nextError, "アカウント情報の更新に失敗しました"));
    } finally {
      setSaving(false);
    }
  });

  if (!isMaster) {
    return (
      <PageShell>
        <ErrorState message="この画面はマスターアカウントのみ利用できます。" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title="アカウント管理" description="マスターアカウントは全ユーザーの表示名と権限を編集できます。" />

      {loading ? (
        <LoadingState message="アカウント一覧を読み込んでいます..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : users.length === 0 ? (
        <EmptyState title="アカウント情報がありません" description="各ユーザーが一度ログインすると一覧へ表示されます。" />
      ) : (
        <div className="grid gap-3">
          {users.map((user) => (
            <Card key={user.user_id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{user.display_name || "未設定"}</p>
                    <Badge variant={user.is_master ? "default" : "outline"}>{user.is_master ? "マスター" : "一般"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{user.user_id}</p>
                </div>
                <Button variant="outline" onClick={() => openEdit(user)}>
                  <UserCog className="h-4 w-4" />
                  編集
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Link to="/settings/profile" className={cn(buttonVariants({ variant: "outline" }))}>
          自分の設定へ戻る
        </Link>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アカウント編集</DialogTitle>
            <DialogDescription>表示名とマスター権限を更新します。</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="admin-display-name">表示名</Label>
              <Input id="admin-display-name" {...form.register("display_name")} />
              {form.formState.errors.display_name ? <p className="text-sm text-destructive">{form.formState.errors.display_name.message}</p> : null}
            </div>
            <label className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-3 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4" {...form.register("is_master")} />
              <span className="inline-flex items-center gap-2">
                <Shield className="h-4 w-4" />
                マスターアカウントにする
              </span>
            </label>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "保存中..." : "保存する"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
