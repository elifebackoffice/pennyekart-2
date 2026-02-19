import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SectionProduct {
  id: string;
  name: string;
  price: number;
  mrp: number;
  discount_rate: number;
  image_url: string | null;
  category: string | null;
  section: string | null;
  coming_soon?: boolean;
}

const sectionLabels: Record<string, string> = {
  featured: "Featured Products",
  most_ordered: "Most Ordered Items",
  new_arrivals: "New Arrivals",
  low_budget: "Low Budget Picks",
  sponsors: "Sponsors",
};

export const useSectionProducts = () => {
  const [products, setProducts] = useState<SectionProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, mrp, discount_rate, image_url, category, section, coming_soon")
        .eq("is_active", true)
        .not("section", "is", null)
        .neq("section", "");
      setProducts((data as SectionProduct[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  // Group by section
  const grouped = products.reduce<Record<string, { label: string; items: SectionProduct[] }>>((acc, p) => {
    const sec = p.section!;
    if (!acc[sec]) acc[sec] = { label: sectionLabels[sec] || sec, items: [] };
    acc[sec].items.push(p);
    return acc;
  }, {});

  return { grouped, products, loading, sectionLabels };
};
