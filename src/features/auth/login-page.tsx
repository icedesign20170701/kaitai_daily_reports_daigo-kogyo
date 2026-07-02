import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/auth-context";
import { signInWithPassword } from "@/features/auth/auth-service";
import { supabaseConfigError } from "@/lib/supabase";

const loginSchema = z.object({
  email: z.string().email("正しいメールアドレスを入力してください"),
  password: z.string().min(6, "6文字以上で入力してください"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/reports";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await signInWithPassword(values.email, values.password);
      toast.success("ログインしました");
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ログインに失敗しました");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">株式会社 大吾興業 作業日報</p>
          <CardTitle className="text-2xl">ログイン</CardTitle>
          <CardDescription>メールアドレスとパスワードでサインインします。</CardDescription>
        </CardHeader>
        <CardContent>
          {supabaseConfigError ? (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
              環境変数 `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定してください。
            </div>
          ) : null}
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email ? (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-11"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground"
                  aria-label={showPassword ? "パスワードを非表示" : "パスワードを表示"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password ? (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
