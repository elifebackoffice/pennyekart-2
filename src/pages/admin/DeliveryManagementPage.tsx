import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Truck, Phone, Mail, MapPin } from "lucide-react";

interface DeliveryStaff {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  is_approved: boolean;
  created_at: string;
  local_body_id: string | null;
  ward_number: number | null;
  local_body_name?: string | null;
  district_name?: string | null;
}

const DeliveryManagementPage = () => {
  const [staff, setStaff] = useState<DeliveryStaff[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStaff = async () => {
    setLoading(true);
    const [profilesRes, localBodiesRes, districtsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_type", "delivery_staff"),
      supabase.from("locations_local_bodies").select("id, name, district_id"),
      supabase.from("locations_districts").select("id, name"),
    ]);

    const localBodies = localBodiesRes.data ?? [];
    const districts = districtsRes.data ?? [];

    const enriched = ((profilesRes.data ?? []) as unknown as DeliveryStaff[]).map((s) => {
      if (s.local_body_id) {
        const lb = localBodies.find((l) => l.id === s.local_body_id);
        if (lb) {
          const dist = districts.find((d) => d.id === lb.district_id);
          return { ...s, local_body_name: lb.name, district_name: dist?.name ?? null };
        }
      }
      return s;
    });

    setStaff(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, []);

  const toggleApproval = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_approved: !current }).eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: !current ? "Staff approved" : "Staff unapproved" });
      fetchStaff();
    }
  };

  const filtered = staff.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.mobile_number?.includes(q)
    );
  });

  const approvedCount = staff.filter((s) => s.is_approved).length;
  const pendingCount = staff.filter((s) => !s.is_approved).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              Delivery Staff Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and approve delivery staff members
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
              {staff.length} Total
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
                <TableHead>Location</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No delivery staff found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {s.email && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            {s.email}
                          </div>
                        )}
                        {s.mobile_number && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {s.mobile_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.district_name || s.local_body_name ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>
                            {s.local_body_name && <span>{s.local_body_name}</span>}
                            {s.district_name && <span className="text-muted-foreground">, {s.district_name}</span>}
                            {s.ward_number && <span className="text-muted-foreground"> (W{s.ward_number})</span>}
                          </span>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.is_approved ? "default" : "secondary"}>
                        {s.is_approved ? "Active" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={s.is_approved}
                        onCheckedChange={() => toggleApproval(s.user_id, s.is_approved)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DeliveryManagementPage;
