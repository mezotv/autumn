import { DrizzleCli } from "@/db/initDrizzle.js";
import { RewardRedemptionService } from "@/internal/rewards/RewardRedemptionService.js";
import { CusExpand, FullCustomer } from "@autumn/shared";
import { CusReferralResponseSchema } from "@autumn/shared";

export const getCusReferrals = async ({
  db,
  fullCus,
  expand,
}: {
  db: DrizzleCli;
  fullCus: FullCustomer;
  expand?: CusExpand[];
}) => {
  if (!expand?.includes(CusExpand.Referrals)) {
    return undefined;
  }

  let referred = await RewardRedemptionService.getByReferrer({
    db,
    internalCustomerId: fullCus.internal_id,
    withCustomer: true,
    withRewardProgram: true,
    limit: 100,
  });

  return referred.map((r) =>
    CusReferralResponseSchema.parse({
      program_id: r.reward_program?.id,
      customer: {
        id: r.customer.id,
        name: r.customer.name,
        email: r.customer.email,
      },
      reward_applied: r.applied,
      created_at: r.created_at,
    }),
  );
};
