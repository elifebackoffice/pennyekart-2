import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Truck, History } from "lucide-react";

interface Order {
  id: string;
  status: string;
  total: number;
  shipping_address: string | null;
  created_at: string;
  items: any;
  user_id: string | null;
}

const STATUS_FLOW = ["pending", "accepted", "pickup", "shipped", "delivered"];

interface Props {
  orders: Order[];
  userId: string;
  onRefresh: () => void;
}

const DeliveryOrders = ({ orders, userId, onRefresh }: Props) => {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const activeOrders = orders.filter((o) => o.status !== "delivered");
  const deliveredOrders = orders.filter((o) => {
    if (o.status !== "delivered") return false;
    if (dateFrom && new Date(o.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(o.created_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  const getNextStatus = (current: string) => {
    const idx = STATUS_FLOW.indexOf(current);
    if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[idx + 1];
  };

  const updateOrderStatus = async (order: Order, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", order.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    if (newStatus === "delivered") {
      await creditWallet(order);
      await deductSellerStock(order);
    }
    toast({ title: `Order ${newStatus}` });
    onRefresh();
  };

  const deductSellerStock = async (order: Order) => {
    if (!Array.isArray(order.items)) return;
    for (const item of order.items) {
      if (!item.id || !item.quantity) continue;
      // Check if this item is a seller product
      const { data: sellerProduct } = await supabase
        .from("seller_products")
        .select("id, stock")
        .eq("id", item.id)
        .maybeSingle();
      if (sellerProduct) {
        const newStock = Math.max(0, (sellerProduct.stock ?? 0) - item.quantity);
        await supabase.from("seller_products").update({ stock: newStock }).eq("id", sellerProduct.id);
      }
    }
  };

  const creditWallet = async (order: Order) => {
    let { data: wallet } = await supabase
      .from("delivery_staff_wallets").select("*").eq("staff_user_id", userId).maybeSingle();
    if (!wallet) {
      const { data: newWallet } = await supabase
        .from("delivery_staff_wallets").insert({ staff_user_id: userId, balance: 0 }).select().single();
      wallet = newWallet;
    }
    if (!wallet) return;
    const deliveryAmount = 30;
    await supabase.from("delivery_staff_wallet_transactions").insert({
      wallet_id: wallet.id, staff_user_id: userId, order_id: order.id,
      amount: deliveryAmount, type: "credit",
      description: `Delivery fee for order ${order.id.slice(0, 8)}`,
    });
    await supabase.from("delivery_staff_wallets")
      .update({ balance: (wallet.balance ?? 0) + deliveryAmount }).eq("id", wallet.id);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "delivered": return "default";
      case "accepted": return "secondary";
      case "shipped": case "pickup": return "outline";
      default: return "secondary";
    }
  };

  const OrderTable = ({ items, showAction }: { items: Order[]; showAction: boolean }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            {showAction && <TableHead>Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={showAction ? 6 : 5} className="text-center text-muted-foreground">No orders</TableCell></TableRow>
          ) : items.map((o) => {
            const next = getNextStatus(o.status);
            return (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}…</TableCell>
                <TableCell>₹{o.total}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{o.shipping_address ?? "—"}</TableCell>
                <TableCell><Badge variant={statusColor(o.status) as any}>{o.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                {showAction && (
                  <TableCell>
                    {next ? (
                      <Button size="sm" onClick={() => updateOrderStatus(o, next)}>
                        {next === "accepted" ? "Accept" : next === "pickup" ? "Pickup" : next === "shipped" ? "Ship" : next === "delivered" ? "Delivered" : next}
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">Done</span>}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Tabs defaultValue="active">
      <TabsList>
        <TabsTrigger value="active"><Truck className="h-4 w-4 mr-1" /> Active ({activeOrders.length})</TabsTrigger>
        <TabsTrigger value="history"><History className="h-4 w-4 mr-1" /> Delivered History</TabsTrigger>
      </TabsList>
      <TabsContent value="active">
        <Card>
          <CardContent className="pt-4">
            <OrderTable items={activeOrders} showAction />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="history">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">From</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">To</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <OrderTable items={deliveredOrders} showAction={false} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default DeliveryOrders;
