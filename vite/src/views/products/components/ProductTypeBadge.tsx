import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Product } from "@autumn/shared";

export const ProductTypeBadge = ({ product }: { product: Product }) => {
  const badgeType = product.is_default
    ? "default"
    : product.is_add_on && "add-on";

  if (!badgeType) return null;

  return (
    // <>
    //   {product.is_default ? (
    //     <Badge variant="outline">Default</Badge>
    //   ) : product.is_add_on ? (
    //     <Badge variant="outline">Add-On</Badge>
    //   ) : (
    //     <></>
    //   )}
    // </>
    <Badge
      className={cn(
        "bg-transparent border border-t1 text-t1 rounded-md px-2 pointer-events-none",
        badgeType === "default" &&
          "bg-stone-200 text-stone-700 border-stone-700",
        badgeType === "add-on" && "bg-zinc-100 text-zinc-500 border-zinc-400"
      )}
    >
      {badgeType}
    </Badge>
  );
};
