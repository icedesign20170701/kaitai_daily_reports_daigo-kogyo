import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth-context";
import { supabase } from "@/lib/supabase";

const profileSchema = z.object({
  display_name: z.string().trim().min(1, "表示名を入力してください").max(50, "50文字以内で入力してください"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const { user, appUser, isMaster } = useAuth();
  const [saving, setSaving] = useState(false);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: appUser?.display_name ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      display_name: appUser?.display_name ?? "",
    });
  }, [appUser, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!user) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("app_users").upsert({
        user_id: user.id,
        display_name: values.display_name,
        is_master: appUser?.is_master ?? false,
        is_subcontractor: appUser?.is_subcontractor ?? false,
      });

      if (error) {
        throw error;
      }

      toast.success("表示名を更新しました。再読み込みすると反映されます。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "表示名の更新に失敗しました");
    } finally {
      setSaving(false);
    }
  });

  return (
    <PageShell>
      <PageHeader title="アカウント設定" description="表示名を設定できます。" />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>表示名</CardTitle>
          <CardDescription>日報の作成者表示などに利用できます。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>登録メールアドレス</Label>
              <div className="rounded-xl border bg-secondary px-3 py-3 text-sm text-muted-foreground">
                {user?.email ?? "メールアドレス未取得"}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_name">表示名</Label>
              <Input id="display_name" {...form.register("display_name")} />
              {form.formState.errors.display_name ? (
                <p className="text-sm text-destructive">{form.formState.errors.display_name.message}</p>
              ) : null}
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存する"}
            </Button>
          </form>
        </CardContent>
      </Card>
      {isMaster ? (
        <Card className="mt-4 max-w-xl">
          <CardHeader>
            <CardTitle>マスター向け管理</CardTitle>
            <CardDescription>全ユーザーの表示名とマスター権限を編集できます。</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/settings/users" className={cn(buttonVariants({ variant: "outline" }))}>
              アカウント管理を開く
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </PageShell>
  );
}
