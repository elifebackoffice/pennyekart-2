import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Product {
  id: string; name: string; description: string | null; price: number;
  category: string | null; stock: number; is_active: boolean; image_url: string | null;
  section: string | null;
}

interface Category {
  id: string; name: string; category_type: string;
}

const sectionOptions = [
  { value: "", label: "None" },
  { value: "most_ordered", label: "Most Ordered Items" },
  { value: "new_arrivals", label: "New Arrivals" },
  { value: "low_budget", label: "Low Budget Picks" },
];

const emptyProduct = { name: "", description: "", price: 0, category: "", stock: 0, is_active: true, image_url: "", section: "" };

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyProduct);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts((data as Product[]) ?? []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name, category_type").eq("is_active", true).order("sort_order");
    setCategories((data as Category[]) ?? []);
  };

  useEffect(() => { fetchProducts(); fetchCategories(); }, []);

  const handleSave = async () => {
    if (editId) {
      const { error } = await supabase.from("products").update({ ...form, updated_by: user?.id }).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("products").insert({ ...form, created_by: user?.id });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    setOpen(false); setForm(emptyProduct); setEditId(null); fetchProducts();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    fetchProducts();
  };

  const openEdit = (p: Product) => {
    setForm({ name: p.name, description: p.description ?? "", price: p.price, category: p.category ?? "", stock: p.stock, is_active: p.is_active, image_url: p.image_url ?? "", section: p.section ?? "" });
    setEditId(p.id); setOpen(true);
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        {hasPermission("create_products") && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyProduct); setEditId(null); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Edit Product" : "New Product"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Price</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
                  <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} /></div>
                </div>
                <div>
                  <Label>Category</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="">Select category</option>
                    {categories.filter(c => c.category_type === "grocery").length > 0 && (
                      <optgroup label="Grocery & Essentials">
                        {categories.filter(c => c.category_type === "grocery").map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {categories.filter(c => c.category_type !== "grocery").length > 0 && (
                      <optgroup label="General Categories">
                        {categories.filter(c => c.category_type !== "grocery").map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <Label>Section</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
                    {sectionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
                <Button className="w-full" onClick={handleSave}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>₹{p.price}</TableCell>
                <TableCell>{p.stock}</TableCell>
                <TableCell>{sectionOptions.find((o) => o.value === p.section)?.label || "—"}</TableCell>
                <TableCell>{p.is_active ? "✓" : "✗"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {hasPermission("update_products") && <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>}
                    {hasPermission("delete_products") && <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
};

export default ProductsPage;
