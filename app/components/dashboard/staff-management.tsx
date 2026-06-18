"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/app/components/confirm-dialog";
import { Search, Plus, Pencil, Trash2, Loader2, UserCog } from "lucide-react";
import { User, addUser, updateUser, deleteUser } from "@/app/lib/auth";
import { toast } from "sonner";
import { useDebounce } from "@/app/hooks/use-debounce";

const baseUserSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi."),
  email: z.string().email("Email tidak valid.").min(1, "Email wajib diisi."),
});

const addUserSchema = baseUserSchema.extend({
  password: z.string().min(1, "Password wajib diisi."),
});

const editUserSchema = baseUserSchema.extend({
  password: z.string().optional(),
});

type AddUserFormValues = z.infer<typeof addUserSchema>;
type EditUserFormValues = z.infer<typeof editUserSchema>;

interface StaffManagementProps {
  users: User[];
  onUsersChange: () => void;
}

export function StaffManagement({ users, onUsersChange }: StaffManagementProps) {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    user: User | null;
    isLoading: boolean;
  }>({ open: false, user: null, isLoading: false });

  const debouncedSearch = useDebounce(search, 300);

  const staffUsers = useMemo(
    () => users.filter((u) => u.role === "staff"),
    [users]
  );

  const filtered = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    if (!term) return staffUsers;
    return staffUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
    );
  }, [staffUsers, debouncedSearch]);

  const openAddDialog = () => {
    setEditingUser(null);
    setDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (isSubmitting) return;
    setDialogOpen(false);
    setEditingUser(null);
  };

  const handleAdd = async (values: AddUserFormValues) => {
    setIsSubmitting(true);
    try {
      const created = addUser({
        name: values.name,
        email: values.email,
        password: values.password,
        role: "staff",
      });
      onUsersChange();
      setDialogOpen(false);
      toast.success(`Staff "${created.name}" berhasil ditambahkan.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambahkan staff.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (values: EditUserFormValues) => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      const updated = updateUser(editingUser.id, {
        name: values.name,
        email: values.email,
        password: values.password,
      });
      if (!updated) {
        toast.error("Staff tidak ditemukan.");
        return;
      }
      onUsersChange();
      setDialogOpen(false);
      setEditingUser(null);
      toast.success(`Staff "${updated.name}" berhasil diperbarui.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui staff.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (user: User) => {
    setConfirmDelete({ open: true, user, isLoading: false });
  };

  const handleDelete = async () => {
    if (!confirmDelete.user) return;
    setConfirmDelete((prev) => ({ ...prev, isLoading: true }));
    try {
      deleteUser(confirmDelete.user.id);
      onUsersChange();
      toast.success(`Staff "${confirmDelete.user.name}" berhasil dihapus.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus staff.");
    } finally {
      setConfirmDelete({ open: false, user: null, isLoading: false });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={openAddDialog}
          aria-label="Tambah staff"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          <UserCog className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">
            {staffUsers.length === 0
              ? "Belum ada staff. Tambahkan staff pertama."
              : "Tidak ada staff yang cocok dengan pencarian."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold truncate">{user.name}</p>
                    <Badge variant="outline" className="text-xs shrink-0">
                      Staff
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(user)}
                    aria-label={`Edit ${user.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => openDeleteDialog(user)}
                    aria-label={`Hapus ${user.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StaffDialog
        open={dialogOpen}
        onOpenChange={closeDialog}
        editingUser={editingUser}
        onAdd={handleAdd}
        onEdit={handleEdit}
        isSubmitting={isSubmitting}
      />

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(open) => {
          if (confirmDelete.isLoading) return;
          if (!open) setConfirmDelete({ open: false, user: null, isLoading: false });
        }}
        title="Hapus Staff"
        description={
          confirmDelete.user
            ? `Yakin ingin menghapus staff "${confirmDelete.user.name}"? Tindakan ini tidak dapat dibatalkan.`
            : ""
        }
        onConfirm={handleDelete}
        confirmLabel="Hapus"
        variant="destructive"
        isLoading={confirmDelete.isLoading}
      />
    </div>
  );
}

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser: User | null;
  onAdd: (values: AddUserFormValues) => Promise<void>;
  onEdit: (values: EditUserFormValues) => Promise<void>;
  isSubmitting: boolean;
}

function StaffDialog({
  open,
  onOpenChange,
  editingUser,
  onAdd,
  onEdit,
  isSubmitting,
}: StaffDialogProps) {
  const isEditing = !!editingUser;

  const addForm = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema) as Resolver<AddUserFormValues>,
    defaultValues: { name: "", email: "", password: "" },
  });

  const editForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema) as Resolver<EditUserFormValues>,
    defaultValues: { name: "", email: "", password: "" },
  });

  // Reset forms when dialog opens/closes or editing user changes
  useEffect(() => {
    if (isEditing) {
      editForm.reset({
        name: editingUser?.name ?? "",
        email: editingUser?.email ?? "",
        password: "",
      });
      addForm.reset({ name: "", email: "", password: "" });
    } else {
      addForm.reset({ name: "", email: "", password: "" });
      editForm.reset({ name: "", email: "", password: "" });
    }
  }, [editingUser, open, isEditing, addForm, editForm]);

  const handleSubmit = isEditing
    ? editForm.handleSubmit(onEdit)
    : addForm.handleSubmit(onAdd);

  const errors = isEditing ? editForm.formState.errors : addForm.formState.errors;
  const register = isEditing ? editForm.register : addForm.register;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Staff" : "Tambah Staff"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Perbarui data staff. Kosongkan password jika tidak ingin mengubahnya."
              : "Tambahkan akun staff baru."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-name">Nama</Label>
            <Input
              id="staff-name"
              placeholder="Nama staff"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              placeholder="staff@dominico.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff-password">
              Password {isEditing && "(kosongkan jika tidak diubah)"}
            </Label>
            <Input
              id="staff-password"
              type="password"
              placeholder={isEditing ? "Password baru" : "Password"}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : isEditing ? (
                "Simpan"
              ) : (
                "Tambah"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
