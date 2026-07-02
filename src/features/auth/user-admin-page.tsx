import { useCallback, useEffect, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Shield, UserCog } from "lucide-react";
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
import { listAppUsers, reorderAppUsers } from "@/features/auth/auth-service";
import { supabase } from "@/lib/supabase";
import { cn, withSupabaseRecovery } from "@/lib/utils";
import type { AppUser } from "@/types/database";

const userSchema = z.object({
  display_name: z.string().trim().min(1, "表示名を入力してください").max(50, "50文字以内で入力してください"),
  is_master: z.boolean(),
  is_subcontractor: z.boolean(),
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 14 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      display_name: "",
      is_master: false,
      is_subcontractor: false,
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await withSupabaseRecovery(
        () => listAppUsers(),
        5000,
        "アカウント一覧の読み込みがタイムアウトしました。再度お試しください。",
      );
      setUsers(data as AppUser[]);
    } catch (nextError) {
      setError(getErrorMessage(nextError, "アカウント一覧の取得に失敗しました"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isMaster) {
      setLoading(false);
      return;
    }
    void load();
  }, [isMaster, load]);

  const openEdit = (user: AppUser) => {
    setEditingUser(user);
    form.reset({
      display_name: user.display_name ?? "",
      is_master: user.is_master,
      is_subcontractor: user.is_subcontractor,
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
          is_subcontractor: values.is_subcontractor,
          sort_order: editingUser.sort_order,
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

  const persistOrder = async (nextUsers: AppUser[]) => {
    const normalizedUsers = nextUsers.map((currentUser, index) => ({ ...currentUser, sort_order: index }));
    setUsers(normalizedUsers);
    try {
      await reorderAppUsers(normalizedUsers);
      toast.success("表示順を更新しました");
    } catch (nextError) {
      toast.error(getErrorMessage(nextError, "表示順の更新に失敗しました"));
      await load();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const currentIndex = users.findIndex((currentUser) => currentUser.user_id === active.id);
    const targetIndex = users.findIndex((currentUser) => currentUser.user_id === over.id);
    if (currentIndex === -1 || targetIndex === -1) {
      return;
    }

    await persistOrder(arrayMove(users, currentIndex, targetIndex));
  };

  const moveByArrow = async (userId: string, direction: -1 | 1) => {
    const currentIndex = users.findIndex((currentUser) => currentUser.user_id === userId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= users.length) {
      return;
    }

    await persistOrder(arrayMove(users, currentIndex, targetIndex));
  };

  function SortableUserCard({ currentUser }: { currentUser: AppUser }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: currentUser.user_id,
    });
    const index = users.findIndex((item) => item.user_id === currentUser.user_id);

    return (
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
        }}
        className={cn(isDragging && "opacity-60")}
      >
        <Card className={cn(isDragging && "shadow-lg")}>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    "touch-target hidden items-center justify-center cursor-grab rounded-lg border border-transparent p-1 text-muted-foreground transition md:inline-flex",
                    "hover:scale-105 hover:border-border hover:bg-accent hover:text-foreground",
                    "active:cursor-grabbing active:scale-95 active:bg-primary/10",
                    isDragging && "cursor-grabbing border-border bg-accent text-foreground",
                  )}
                  aria-label={`${currentUser.display_name || "未設定"}を並び替え`}
                  title="ドラッグして並び替え"
                  {...attributes}
                  {...listeners}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <p className="font-bold">{currentUser.display_name || "未設定"}</p>
                <Badge variant={currentUser.is_master ? "default" : "outline"}>{currentUser.is_master ? "マスター" : "一般"}</Badge>
                {currentUser.is_subcontractor ? <Badge variant="secondary">外注業社</Badge> : null}
              </div>
              <p className="text-xs text-muted-foreground">{currentUser.user_id}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="grid grid-cols-3 gap-2 md:hidden">
                <Button variant="outline" size="icon" className="w-full" onClick={() => void moveByArrow(currentUser.user_id, -1)} disabled={index <= 0}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-full"
                  onClick={() => void moveByArrow(currentUser.user_id, 1)}
                  disabled={index === -1 || index >= users.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="w-full" onClick={() => openEdit(currentUser)}>
                  編集
                </Button>
              </div>
              <Button variant="outline" className="hidden w-full sm:w-auto md:inline-flex" onClick={() => openEdit(currentUser)}>
                <UserCog className="h-4 w-4" />
                編集
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <LoadingState message="アカウント一覧を読み込んでいます..." showProgress expectedDurationMs={3000} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : users.length === 0 ? (
        <EmptyState title="アカウント情報がありません" description="各ユーザーが一度ログインすると一覧へ表示されます。" />
      ) : open ? (
        <div className="grid gap-3">
          {users.map((currentUser) => (
            <SortableUserCard key={currentUser.user_id} currentUser={currentUser} />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void handleDragEnd(event)}>
          <SortableContext items={users.map((currentUser) => currentUser.user_id)} strategy={verticalListSortingStrategy}>
            <div className="grid gap-3">
              {users.map((currentUser) => (
                <SortableUserCard key={currentUser.user_id} currentUser={currentUser} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
            <DialogDescription>表示名、マスター権限、外注業社権限を更新します。</DialogDescription>
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
            <label className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-3 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4" {...form.register("is_subcontractor")} />
              <span>外注業社権限を付与する</span>
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
