import { Home, Tag, User, ShoppingCart, PlayCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { icon: Home, label: "Home", path: "/" },
  { icon: PlayCircle, label: "Play", path: "/" },
  { icon: Tag, label: "Top Deals", path: "/" },
  { icon: User, label: "Account", path: "/customer/profile" },
  { icon: ShoppingCart, label: "Cart", path: "/cart" },
];

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden">
      <div className="flex items-center justify-around py-2">
        {tabs.map((t) => (
          <button
            key={t.label}
            onClick={() => navigate(t.path)}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
              location.pathname === t.path
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-5 w-5" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
