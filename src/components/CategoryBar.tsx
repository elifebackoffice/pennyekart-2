import {
  Smartphone,
  Shirt,
  Home,
  Dumbbell,
  Sparkles,
  BookOpen,
  Laptop,
  Baby,
  Car,
  Gift,
} from "lucide-react";

const categories = [
  { icon: Smartphone, name: "Mobiles" },
  { icon: Laptop, name: "Electronics" },
  { icon: Shirt, name: "Fashion" },
  { icon: Home, name: "Home" },
  { icon: Sparkles, name: "Beauty" },
  { icon: Dumbbell, name: "Sports" },
  { icon: BookOpen, name: "Books" },
  { icon: Baby, name: "Kids" },
  { icon: Car, name: "Auto" },
  { icon: Gift, name: "Gifts" },
];

interface CategoryBarProps {
  onCategoryClick?: (name: string) => void;
  selectedCategory?: string | null;
}

const CategoryBar = ({ onCategoryClick, selectedCategory }: CategoryBarProps) => {
  const renderBtn = (c: typeof categories[0], compact = false) => {
    const isSelected = selectedCategory === c.name;
    return (
      <button
        key={c.name}
        onClick={() => onCategoryClick?.(c.name)}
        className={`group flex shrink-0 flex-col items-center gap-1.5 ${compact ? "" : "px-3 py-1"} transition-colors`}
      >
        <div className={`flex items-center justify-center rounded-full transition-colors ${
          compact ? "h-12 w-12" : "h-10 w-10"
        } ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted group-hover:bg-secondary group-hover:text-secondary-foreground"}`}>
          <c.icon className="h-5 w-5" />
        </div>
        <span className={`font-medium ${isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"} ${compact ? "text-[11px]" : "text-xs"}`}>
          {c.name}
        </span>
      </button>
    );
  };

  return (
    <div className="border-b bg-card">
      <div className="container py-3">
        <div className="hidden md:flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide">
          {categories.map((c) => renderBtn(c))}
        </div>
        <div className="md:hidden">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {categories.slice(0, 5).map((c) => renderBtn(c, true))}
          </div>
          <div className="flex gap-4 overflow-x-auto pt-1 scrollbar-hide">
            {categories.slice(5).map((c) => renderBtn(c, true))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryBar;
