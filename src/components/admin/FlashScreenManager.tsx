import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Pencil, Trash2, MonitorSmartphone } from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";

interface FlashScreen {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  content_text: string | null;
  gradient_from: string | null;
  gradient_to: string | null;
  open_trigger: string;
  open_delay_seconds: number;
  auto_disappear_seconds: number;
  target_audience: string;
}

const emptyForm = {
  title: "", image_url: "", link_url: "", is_active: true, sort_order: 0,
  content_text: "", gradient_from: "#6366f1", gradient_to: "#8b5cf6",
  open_trigger: "refresh", open_delay_seconds: 2, auto_disappear_seconds: 0, target_audience: "all",
};

const audienceLabel: Record<string, string> = {
  all: "All users",
  unlogged: "Un-logged only",
  every_refresh: "Every refresh",
};

const FlashScreenManager = () => {
  const [items, setItems] = useState<FlashScreen[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchItems = async () => {
    const { data } = await supabase
      .from("offer_flash_screens" as any)
      .select("*")
      .order("sort_order");
    setItems((data as any as FlashScreen[]) ?? []);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    if (!form.title) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const payload = {
      title: form.title,
      image_url: form.image_url || null,
      link_url: form.link_url || null,
      is_active: form.is_active,
      sort_order: form.sort_order,
      content_text: form.content_text || null,
      gradient_from: form.gradient_from || '#6366f1',
      gradient_to: form.gradient_to || '#8b5cf6',
      open_trigger: form.open_trigger,
      open_delay_seconds: form.open_delay_seconds,
      auto_disappear_seconds: form.auto_disappear_seconds,
      target_audience: form.target_audience,
    };
    if (editId) {
      const { error } = await (supabase.from("offer_flash_screens" as any) as any).update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await (supabase.from("offer_flash_screens" as any) as any).insert({ ...payload, created_by: user?.id });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    setOpen(false);
    setForm(emptyForm);
    setEditId(null);
    fetchItems();
    toast({ title: editId ? "Updated" : "Created" });
  };

  const handleDelete = async (id: string) => {
    await (supabase.from("offer_flash_screens" as any) as any).delete().eq("id", id);
    fetchItems();
    toast({ title: "Deleted" });
  };

  const openEdit = (item: FlashScreen) => {
    setForm({
      title: item.title,
      image_url: item.image_url ?? "",
      link_url: item.link_url ?? "",
      is_active: item.is_active,
      sort_order: item.sort_order,
      content_text: item.content_text ?? "",
      gradient_from: item.gradient_from ?? "#6366f1",
      gradient_to: item.gradient_to ?? "#8b5cf6",
      open_trigger: item.open_trigger ?? "refresh",
      open_delay_seconds: item.open_delay_seconds ?? 2,
      auto_disappear_seconds: item.auto_disappear_seconds ?? 0,
      target_audience: item.target_audience ?? "all",
    });
    setEditId(item.id);
    setOpen(true);
  };

  const canEdit = hasPermission("update_products");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Flash Screen Offer Banners</CardTitle>
            <Badge variant="secondary">{items.length}</Badge>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => { setForm(emptyForm); setEditId(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Each banner has its own display behavior — audience targeting, delay, and auto-disappear settings.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No flash screen banners yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border p-3 bg-background space-y-2">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="w-full h-32 rounded-md object-cover" />
                ) : (
                  <div
                    className="w-full h-32 rounded-md flex items-center justify-center text-white text-sm font-medium px-3 text-center"
                    style={{ background: `linear-gradient(135deg, ${item.gradient_from || '#6366f1'}, ${item.gradient_to || '#8b5cf6'})` }}
                  >
                    {item.content_text || item.title}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <Badge variant={item.is_active ? "default" : "secondary"} className="text-[10px]">
                        {item.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {audienceLabel[item.target_audience] || item.target_audience}
                      </Badge>
                      {item.open_delay_seconds > 0 && (
                        <span className="text-[10px] text-muted-foreground">Delay: {item.open_delay_seconds}s</span>
                      )}
                      {item.auto_disappear_seconds > 0 && (
                        <span className="text-[10px] text-muted-foreground">Auto: {item.auto_disappear_seconds}s</span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setEditId(null); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Flash Screen Banner" : "New Flash Screen Banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Content Text (manual content)</Label>
              <Textarea
                value={form.content_text}
                onChange={(e) => setForm({ ...form, content_text: e.target.value })}
                placeholder="Add custom text content for the popup notification..."
                rows={3}
              />
              <p className="text-[10px] text-muted-foreground mt-1">This text shows on the gradient background when no image is set</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Gradient From</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.gradient_from} onChange={(e) => setForm({ ...form, gradient_from: e.target.value })} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={form.gradient_from} onChange={(e) => setForm({ ...form, gradient_from: e.target.value })} className="flex-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Gradient To</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.gradient_to} onChange={(e) => setForm({ ...form, gradient_to: e.target.value })} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={form.gradient_to} onChange={(e) => setForm({ ...form, gradient_to: e.target.value })} className="flex-1" />
                </div>
              </div>
            </div>
            {/* Preview */}
            <div>
              <Label className="text-xs">Gradient Preview</Label>
              <div
                className="w-full h-20 rounded-lg flex items-center justify-center text-white text-sm font-medium px-4 text-center"
                style={{ background: `linear-gradient(135deg, ${form.gradient_from}, ${form.gradient_to})` }}
              >
                {form.content_text || form.title || "Preview"}
              </div>
            </div>
            <ImageUpload
              bucket="banners"
              value={form.image_url}
              onChange={(url) => setForm({ ...form, image_url: url })}
              label="Banner Image (optional - overrides gradient)"
            />
            <div>
              <Label>Link URL (optional)</Label>
              <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="e.g. /flash-sale/123 or https://..." />
            </div>

            {/* Per-screen behavior settings */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Display Behavior</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Target Audience</Label>
                  <Select value={form.target_audience} onValueChange={(v) => setForm({ ...form, target_audience: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="unlogged">Un-logged in users only</SelectItem>
                      <SelectItem value="every_refresh">After every refresh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Open Trigger</Label>
                  <Select value={form.open_trigger} onValueChange={(v) => setForm({ ...form, open_trigger: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="refresh">On page load</SelectItem>
                      <SelectItem value="countdown">After countdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Open Delay (seconds)</Label>
                  <Input type="number" min={0} max={60} value={form.open_delay_seconds} onChange={(e) => setForm({ ...form, open_delay_seconds: Math.max(0, parseInt(e.target.value) || 0) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Auto Disappear (seconds)</Label>
                  <Input type="number" min={0} max={120} value={form.auto_disappear_seconds} onChange={(e) => setForm({ ...form, auto_disappear_seconds: Math.max(0, parseInt(e.target.value) || 0) })} />
                  <p className="text-[10px] text-muted-foreground">{form.auto_disappear_seconds === 0 ? "Manual close only" : `Closes after ${form.auto_disappear_seconds}s`}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <Button className="w-full" onClick={handleSave}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default FlashScreenManager;
