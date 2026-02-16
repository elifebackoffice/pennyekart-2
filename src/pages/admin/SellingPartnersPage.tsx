import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Store, Phone, Mail, Package, Eye } from "lucide-react";

interface SellingPartner {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  is_approved: boolean;
  created_at: string;
  product_count?: number;
}

interface SellerProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
  is_approved: boolean;
  image_url: string | null;
  category: string | null;
}

const SellingPartnersPage = () => {
  const [partners, setPartners] = useState<SellingPartner[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<SellingPartner | null>(null);
  const [partnerProducts, setPartnerProducts] = useState<SellerProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const { toast } = useToast();

  const fetchPartners = async () => {
    setLoading(true);
    const [profilesRes, productsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_type", "selling_partner"),
      supabase.from("seller_products").select("seller_id"),
    ]);

    const productCounts: Record<string, number> = {};
    (productsRes.data ?? []).forEach((p) => {
      productCounts[p.seller_id] = (productCounts[p.seller_id] || 0) + 1;
    });

    const enriched = ((profilesRes.data ?? []) as unknown as SellingPartner[]).map((p) => ({
      ...p,
      product_count: productCounts[p.user_id] || 0,
    }));

    setPartners(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchPartners(); }, []);

  const toggleApproval = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_approved: !current }).eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: !current ? "Partner approved" : "Partner unapproved" });
      fetchPartners();
    }
  };

  const toggleProductApproval = async (productId: string, current: boolean) => {
    const { error } = await supabase.from("seller_products").update({ is_approved: !current }).eq("id", productId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: !current ? "Product approved" : "Product unapproved" });
      viewProducts(selectedPartner!);
    }
  };

  const viewProducts = async (partner: SellingPartner) => {
    setSelectedPartner(partner);
    setProductsLoading(true);
    const { data } = await supabase
      .from("seller_products")
      .select("*")
      .eq("seller_id", partner.user_id);
    setPartnerProducts((data ?? []) as SellerProduct[]);
    setProductsLoading(false);
  };

  const filtered = partners.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.mobile_number?.includes(q)
    );
  });

  const approvedCount = partners.filter((p) => p.is_approved).length;
  const pendingCount = partners.filter((p) => !p.is_approved).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              Selling Partners Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage selling partners and approve their products
            </p>
          </div>
          <div className="flex gap-3">
            <Badge variant="default" className="text-sm px-3 py-1">
              {approvedCount} Approved
            </Badge>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {pendingCount} Pending
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {partners.length} Total
            </Badge>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No selling partners found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {p.email && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            {p.email}
                          </div>
                        )}
                        {p.mobile_number && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {p.mobile_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Package className="h-3 w-3" />
                        {p.product_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.is_approved ? "default" : "secondary"}>
                        {p.is_approved ? "Active" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={p.is_approved}
                        onCheckedChange={() => toggleApproval(p.user_id, p.is_approved)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => viewProducts(p)}>
                        <Eye className="h-4 w-4 mr-1" /> Products
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Products Dialog */}
      <Dialog open={!!selectedPartner} onOpenChange={() => setSelectedPartner(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Products by {selectedPartner?.full_name ?? "Partner"}</DialogTitle>
          </DialogHeader>
          {productsLoading ? (
            <p className="text-center py-4 text-muted-foreground">Loading products...</p>
          ) : partnerProducts.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No products listed</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Approved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partnerProducts.map((prod) => (
                  <TableRow key={prod.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {prod.image_url && (
                          <img src={prod.image_url} alt={prod.name} className="h-8 w-8 rounded object-cover" />
                        )}
                        {prod.name}
                      </div>
                    </TableCell>
                    <TableCell>{prod.category ?? "—"}</TableCell>
                    <TableCell>₹{prod.price}</TableCell>
                    <TableCell>{prod.stock}</TableCell>
                    <TableCell>
                      <Badge variant={prod.is_active ? "default" : "secondary"}>
                        {prod.is_active ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={prod.is_approved}
                        onCheckedChange={() => toggleProductApproval(prod.id, prod.is_approved)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default SellingPartnersPage;
