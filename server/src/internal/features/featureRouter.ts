import express, { Router } from "express";

import { FeatureService } from "./FeatureService.js";

export const featureRouter: Router = express.Router();

featureRouter.get("", async (req: any, res: any) => {
  try {
    let features = await FeatureService.getFromReq(req);
    res.status(200).json({ features });
  } catch (error: any) {
    console.log("Error fetching features:", error);
    res.status(500).json({ error: error.message });
  }
});
