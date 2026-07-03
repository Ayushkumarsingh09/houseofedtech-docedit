"use client";

import { useTheme } from "next-themes";

import { AppTopbar } from "@/components/layout/app-topbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth, useLogout } from "@/features/auth/hooks/use-auth";
import { useSettings, useUpdateSettings } from "@/features/settings/hooks/use-settings";
import { getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { theme, setTheme } = useTheme();
  const logout = useLogout();
  const fontSize = settings?.editorFontSize ?? 16;

  if (!user) return null;

  return (
    <>
      <AppTopbar>
        <h1 className="text-lg font-semibold">Settings</h1>
      </AppTopbar>
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback
                style={{ backgroundColor: user.avatarColor }}
                className="text-lg"
              >
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how Nimbus Docs looks and feels.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>Editor font size</Label>
              <Select
                value={String(fontSize)}
                onValueChange={(value) =>
                  updateSettings.mutate({ editorFontSize: Number(value) })
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[14, 16, 18, 20].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}px
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Email notifications</Label>
                <p className="text-muted-foreground text-xs">
                  Get notified when someone shares a document with you.
                </p>
              </div>
              <Switch
                checked={settings?.emailNotifications ?? true}
                onCheckedChange={(checked) =>
                  updateSettings.mutate({ emailNotifications: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your session.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => logout.mutate()}>
              Log out of all devices
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
