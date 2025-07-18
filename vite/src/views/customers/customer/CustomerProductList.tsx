import { formatUnixToDateTime } from "@/utils/formatUtils/formatDateUtils";
import {
  compareStatus,
  getBackendErr,
  navigateTo,
  notNullish,
} from "@/utils/genUtils";
import { CusProduct, CusProductStatus, FullCusProduct } from "@autumn/shared";
import { useNavigate } from "react-router";
import { useCustomerContext } from "./CustomerContext";

import {
  DropdownMenuItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { keyToTitle } from "@/utils/formatUtils/formatTextUtils";
import { CusService } from "@/services/customers/CusService";
import { useAxiosInstance } from "@/services/useAxiosInstance";
import SmallSpinner from "@/components/general/SmallSpinner";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { ToolbarButton } from "@/components/general/table-components/ToolbarButton";

import { AdminHover } from "@/components/general/AdminHover";
import AddProduct from "./add-product/NewProductDropdown";
import { Item, Row } from "@/components/general/TableGrid";
import { cn } from "@/lib/utils";
import { CusProductStripeLink } from "./components/CusProductStripeLink";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const CustomerProductList = ({
  customer,
  products,
}: {
  customer: any;
  products: any;
}) => {
  const navigate = useNavigate();
  const { env, versionCounts, entities, entityId } = useCustomerContext();
  const [showExpired, setShowExpired] = useState(false);

  const sortedProducts = customer.products
    .filter((p: CusProduct & { entitlements: any[] }) => {
      if (showExpired) {
        return true;
      }

      const entity = entities.find((e: any) => e.id === entityId);

      const entityMatches =
        entity && notNullish(p.internal_entity_id)
          ? p.internal_entity_id === entity.internal_id ||
            p.entitlements.some(
              (cusEnt: any) =>
                cusEnt.entities &&
                Object.keys(cusEnt.entities).includes(entity.internal_id),
            )
          : true;

      return (
        p.status !== CusProductStatus.Expired &&
        (entityId ? entityMatches : true)
      );
    })
    .sort((a: any, b: any) => {
      if (a.status !== b.status) {
        return compareStatus(a.status, b.status);
      }

      return b.created_at - a.created_at;
    });

  return (
    <div>
      <div className="flex items-center grid grid-cols-10 gap-8 justify-between border-y bg-stone-100 pl-10 pr-7 h-10">
        <h2 className="text-sm text-t2 font-medium col-span-2 flex">
          Products
        </h2>
        <div className="flex w-full h-full items-center col-span-8 justify-end">
          <div className="flex w-fit h-full items-center gap-4">
            <Button
              variant="ghost"
              className={cn(
                "text-t3 text-xs font-normal p-0",
                showExpired && "text-t1 hover:text-t1",
              )}
              size="sm"
              onClick={() => setShowExpired(!showExpired)}
            >
              Show Expired
            </Button>
            {/* <CreateEntitlement buttonType={"feature"} /> */}
            <AddProduct />
          </div>
        </div>
      </div>
      {sortedProducts.length === 0 ? (
        <div className="flex pl-10 items-center h-10">
          <p className="text-t3">Attach a product to this customer</p>
        </div>
      ) : (
        <Row type="header" className="grid-cols-12 pr-0">
          <Item className="col-span-3">Name</Item>
          <Item className="col-span-3">Product ID</Item>
          <Item className="col-span-3">Status</Item>
          <Item className="col-span-2">Created At</Item>
          <Item className="col-span-1" />
        </Row>
      )}
      {sortedProducts.map((cusProduct: FullCusProduct) => {
        return (
          <Row
            key={cusProduct.id}
            className="grid-cols-12 pr-0"
            onClick={() => {
              const entity = entities.find(
                (e: any) => e.internal_id === cusProduct.internal_entity_id,
              );
              navigateTo(
                `/customers/${customer.id || customer.internal_id}/${
                  cusProduct.product_id
                }?id=${cusProduct.id}${
                  entity ? `&entity_id=${entity.id || entity.internal_id}` : ""
                }`,
                navigate,
                env,
              );
            }}
          >
            <Item className="col-span-3">
              <AdminHover
                texts={[
                  {
                    key: "Cus Product ID",
                    value: cusProduct.id,
                  },
                  // {
                  //   key: "Stripe Subscription ID",
                  //   value: cusProduct.subscription_ids?.[0] || "N/A",
                  // },
                  ...(cusProduct.subscription_ids
                    ? cusProduct.subscription_ids.map((id: string) => ({
                        key: "Stripe Subscription ID",
                        value: id,
                      }))
                    : []),
                  {
                    key: "Entity ID",
                    value: cusProduct.entity_id || "N/A",
                  },
                ]}
              >
                <div className="flex items-center gap-2">
                  <p>{cusProduct.product.name}</p>
                  {versionCounts[cusProduct.product.id] > 1 && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-stone-50 text-t3 px-2 py-0 ml-2 font-mono"
                    >
                      v{cusProduct.product.version}
                    </Badge>
                  )}
                </div>
              </AdminHover>
            </Item>
            <Item className="col-span-3 text-t3 font-mono overflow-hidden text-ellipsis">
              {cusProduct.product_id}
            </Item>
            <Item className="col-span-3">
              <div className="flex gap-0.5 items-center">
                {cusProduct.status === "active" && (
                  <Badge variant="status" className="bg-lime-500 h-fit">
                    active
                  </Badge>
                )}
                {cusProduct.status === "expired" && (
                  <Badge variant="status" className="bg-stone-800 h-fit">
                    expired
                  </Badge>
                )}
                {cusProduct.status === "past_due" && (
                  <Badge variant="status" className="bg-red-500 h-fit">
                    past due
                  </Badge>
                )}
                {cusProduct.status === "scheduled" && (
                  <Badge variant="status" className="bg-blue-500 h-fit">
                    scheduled
                  </Badge>
                )}
                <CusProductStripeLink cusProduct={cusProduct} />
              </div>
            </Item>
            <Item className="col-span-2 text-xs text-t3">
              {formatUnixToDateTime(cusProduct.created_at).date}{" "}
              {formatUnixToDateTime(cusProduct.created_at).time}
            </Item>
            <Item className="col-span-1 pr-4 flex items-center justify-center">
              <EditCustomerProductToolbar cusProduct={cusProduct} />
            </Item>
          </Row>
        );
      })}
    </div>
  );
};

const EditCustomerProductToolbar = ({
  cusProduct,
}: {
  cusProduct: FullCusProduct;
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <DropdownMenu open={dialogOpen} onOpenChange={setDialogOpen}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton className="!w-4 !h-6 !rounded-md text-t3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="text-t2">
        {/* Update status */}
        {[CusProductStatus.Expired].map((status) => (
          <DropdownMenuItem
            key={status}
            className="p-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <UpdateStatusDropdownBtn cusProduct={cusProduct} status={status} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const UpdateStatusDropdownBtn = ({
  cusProduct,
  status,
}: {
  cusProduct: FullCusProduct;
  status: CusProductStatus;
}) => {
  const [loading, setLoading] = useState(false);
  const [showDefaultWarning, setShowDefaultWarning] = useState(false);
  const { env, cusMutate } = useCustomerContext();
  const axiosInstance = useAxiosInstance({ env });

  const handleStatusUpdate = async () => {
    setLoading(true);
    try {
      await CusService.updateCusProductStatus(axiosInstance, cusProduct.id, {
        status,
      });
      await cusMutate();
    } catch (error) {
      toast.error(getBackendErr(error, "Failed to update status"));
    }
    setLoading(false);
  };

  const handleExpireClick = () => {
    // Check if this is the expired status and if the product is default
    if (status === CusProductStatus.Expired && cusProduct.product?.is_default) {
      setShowDefaultWarning(true);
    } else {
      handleStatusUpdate();
    }
  };

  return (
    <>
      <Dialog open={showDefaultWarning} onOpenChange={setShowDefaultWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Expire Default Product</DialogTitle>
          </DialogHeader>
          <div className="">
            <p className="text-sm text-gray-600">
              This is the default product. Expiring it will reattach it to the
              customer and reset their features.
            </p>
          </div>
          <DialogFooter>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDefaultWarning(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowDefaultWarning(false);
                  handleStatusUpdate();
                }}
              >
                Expire Default
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        variant="ghost"
        dim={5}
        size="sm"
        className="p-2 h-full w-full flex justify-between"
        onClick={handleExpireClick}
      >
        {loading ? (
          <SmallSpinner />
        ) : (
          <>
            <span>{keyToTitle(status)}</span>
          </>
        )}
      </Button>
    </>
  );
};
