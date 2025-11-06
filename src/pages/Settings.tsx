import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", college: "", phone: "" });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const userRes: any = await supabase.auth.getUser();
        const user = userRes?.data?.user;
        if (!user) {
          toast({ title: "Not signed in", description: "Please sign in to manage settings", variant: "destructive" });
          setLoading(false);
          return;
        }

        // fetch profile
        const profileRes: any = await (supabase.from("profiles") as any).select("full_name, college, phone").eq("id", user.id).maybeSingle();
        if (profileRes?.error) throw profileRes.error;

        setForm((f) => ({
          ...f,
          fullName: profileRes?.data?.full_name || user.user_metadata?.full_name || user.email || "",
          email: user.email || "",
          college: profileRes?.data?.college || "",
          phone: profileRes?.data?.phone || "",
        }));
      } catch (err: any) {
        console.error("Failed to load settings:", err);
        toast({ title: "Error", description: "Failed to load settings", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const userRes: any = await supabase.auth.getUser();
      const user = userRes?.data?.user;
      if (!user) throw new Error("Not authenticated");

      // upsert profile
      const payload = {
        id: user.id,
        full_name: form.fullName,
        college: form.college,
        phone: form.phone,
      };

      const upsertRes: any = await (supabase.from("profiles") as any).upsert(payload, { returning: "representation" });
      if (upsertRes?.error) throw upsertRes.error;

      toast({ title: "Saved", description: "Settings saved successfully" });
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      toast({ title: "Error", description: err?.message || "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <SettingsIcon className="mr-2 h-6 w-6" />
            Account Settings
          </CardTitle>
          <CardDescription>
            Manage your profile and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Enter your full name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} placeholder="your@email.com" disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="college">College/University</Label>
            <Input id="college" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} placeholder="Your institution" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" placeholder="+1 (555) 000-0000" />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
