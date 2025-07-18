import { DrizzleCli } from "@/db/initDrizzle.js";
import { CusEntService } from "@/internal/customers/cusProducts/cusEnts/CusEntitlementService.js";
import { getResetBalance } from "@/internal/customers/cusProducts/cusEnts/cusEntUtils.js";
import { getRelatedCusEnt } from "@/internal/customers/cusProducts/cusPrices/cusPriceUtils.js";
import { CusProductService } from "@/internal/customers/cusProducts/CusProductService.js";
import { getEntOptions } from "@/internal/products/prices/priceUtils.js";
import { notNullish } from "@/utils/genUtils.js";
import {
  Customer,
  EntInterval,
  FeatureOptions,
  FullCusProduct,
  FullCustomerPrice,
} from "@autumn/shared";
import Stripe from "stripe";

export const handlePrepaidPrices = async ({
  db,
  stripeCli,
  cusProduct,
  cusPrice,
  usageSub,
  customer,
  invoice,
  logger,
}: {
  db: DrizzleCli;
  stripeCli: Stripe;
  cusProduct: FullCusProduct;
  cusPrice: FullCustomerPrice;
  usageSub: Stripe.Subscription;
  customer: Customer;
  invoice: Stripe.Invoice;
  logger: any;
}) => {
  const isNewPeriod = invoice.period_start !== usageSub.current_period_start;
  if (!isNewPeriod) {
    return;
  }

  const cusEnt = getRelatedCusEnt({
    cusPrice,
    cusEnts: cusProduct.customer_entitlements,
  });

  if (!cusEnt) {
    logger.error(
      `Tried to handle prepaid price for ${cusPrice.id} (${cusPrice.price.id}) but no cus ent found`,
    );
    return;
  }

  const options = getEntOptions(cusProduct.options, cusEnt.entitlement);

  const resetBalance = getResetBalance({
    entitlement: cusEnt.entitlement,
    options: notNullish(options?.upcoming_quantity)
      ? {
          feature_id: options?.feature_id!,
          quantity: options?.upcoming_quantity!,
        }
      : options,
    relatedPrice: cusPrice.price,
  });

  const ent = cusEnt.entitlement;

  if (notNullish(options?.upcoming_quantity)) {
    const newOptions = cusProduct.options.map((o) => {
      if (o.feature_id == ent.feature_id) {
        return {
          ...o,
          quantity: o.upcoming_quantity,
          upcoming_quantity: undefined,
        };
      }
      return o;
    });

    await CusProductService.update({
      db,
      cusProductId: cusProduct.id,
      updates: {
        options: newOptions as FeatureOptions[],
      },
    });

    if (ent.interval == EntInterval.Lifetime) {
      let difference = options?.quantity! - options?.upcoming_quantity!;
      await CusEntService.decrement({
        db,
        id: cusEnt.id,
        amount: difference,
      });
      return;
    }
  }

  if (ent.interval == EntInterval.Lifetime) {
    return;
  }

  logger.info(
    `🔥 Resetting balance for ${ent.feature.id}, customer: ${customer.id} (name: ${customer.name})`,
  );

  await CusEntService.update({
    db,
    id: cusEnt.id,
    updates: {
      balance: resetBalance,
      adjustment: 0,
      next_reset_at: usageSub.current_period_end * 1000,
    },
  });
};
