"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddCollaborator,
  useCollaborators,
  useRemoveCollaborator,
  useUpdateCollaborator,
} from "@/features/documents/hooks/use-collaborators";
import { getInitials } from "@/lib/utils";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["EDITOR", "VIEWER"]),
});
type InviteInput = z.infer<typeof inviteSchema>;

export function CollaboratorsDialog({
  documentId,
  isOwner,
  open,
  onOpenChange,
}: {
  documentId: string;
  isOwner: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: collaborators } = useCollaborators(documentId, open);
  const addCollaborator = useAddCollaborator(documentId);
  const updateCollaborator = useUpdateCollaborator(documentId);
  const removeCollaborator = useRemoveCollaborator(documentId);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "EDITOR" },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5" /> Share document
          </DialogTitle>
          <DialogDescription>
            Invite people to collaborate. Editors can write; viewers can only read and
            stay in sync.
          </DialogDescription>
        </DialogHeader>

        {isOwner && (
          <form
            className="flex items-start gap-2"
            onSubmit={handleSubmit((values) => {
              addCollaborator.mutate(values, { onSuccess: () => reset() });
            })}
          >
            <div className="flex-1">
              <Input placeholder="teammate@example.com" {...register("email")} />
              {errors.email && (
                <p className="text-destructive mt-1 text-xs">{errors.email.message}</p>
              )}
            </div>
            <Select
              defaultValue="EDITOR"
              onValueChange={(value) => setValue("role", value as "EDITOR" | "VIEWER")}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EDITOR">Editor</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={addCollaborator.isPending}>
              {addCollaborator.isPending && <Loader2 className="size-4 animate-spin" />}
              Invite
            </Button>
          </form>
        )}

        <div className="space-y-2">
          {collaborators?.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No collaborators yet — you&apos;re the only one here.
            </p>
          )}
          {collaborators?.map((collaborator) => (
            <div
              key={collaborator.id}
              className="flex items-center justify-between gap-2 rounded-md border p-2"
            >
              <div className="flex items-center gap-2.5">
                <Avatar className="size-8">
                  <AvatarFallback style={{ backgroundColor: collaborator.avatarColor }}>
                    {getInitials(collaborator.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{collaborator.name}</p>
                  <p className="text-muted-foreground text-xs">{collaborator.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOwner ? (
                  <Select
                    value={collaborator.role}
                    onValueChange={(role) =>
                      updateCollaborator.mutate({ userId: collaborator.userId, role })
                    }
                  >
                    <SelectTrigger size="sm" className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EDITOR">Editor</SelectItem>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    {collaborator.role}
                  </span>
                )}
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive size-8"
                    onClick={() => removeCollaborator.mutate(collaborator.userId)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
