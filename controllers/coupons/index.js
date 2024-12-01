import CreateDiscountCode from "#common-functions/shopify/createDiscountCoupon.js";
import Bundles from "#schemas/bundles.js";
import Coupons from "#schemas/coupons.js";
import Stores from "#schemas/stores.js";

export const CreateCoupon = async (req) => {
  try {
    const {
      code,
      title,
      discountValue,
      discountType,
      appliesTo,
      bundleIds,
      usageLimit,
      appliesOncePerCustomer,
      startsAt,
      endsAt,
      isActive,
      purchaseType,
      minimumPurchaseAmount,
      maxNumberOfUse,
      limitTheNumberOfUse,
    } = req.body;
    const { user } = req;

    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    }).lean();

    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }

    // Check if the code already exists
    const existingCoupon = await Coupons.findOne({ code });
    if (existingCoupon) {
      return {
        message: "Coupon code already exists",
        status: 400,
      };
    }

    // Create the coupon document
    const couponObj = {
      store: store._id,
      code,
      title,
      discountValue,
      discountType,
      appliesTo,
      bundleIds,
      usageLimit,
      appliesOncePerCustomer,
      startsAt,
      endsAt,
      isActive,
      purchaseType,
      minimumPurchaseAmount,
      maxNumberOfUse,
      limitTheNumberOfUse,
    };
    const bundles = await Bundles.find({
      _id: { $in: bundleIds },
    }).lean();

    const shopifyBundleIds = bundles.map((b) => b.shopifyProductId);
    const shopifyCouponObj = { ...couponObj };
    shopifyCouponObj.bundleIds = shopifyBundleIds;

    // save the coupon in shopify
    const shopifyCoupon = await CreateDiscountCode({
      accessToken: store.accessToken,
      coupon: shopifyCouponObj,
      shopName: store.shopName,
    });
    if (shopifyCoupon.id) {
      couponObj["shopifyId"] = shopifyCoupon.id;
      if (couponObj.appliesTo === "all") {
        delete couponObj.bundleIds;
      }
      const coupon = new Coupons(couponObj);
      const savedCoupon = await coupon.save();

      return {
        message: "Coupon created successfully",
        status: 201,
        data: savedCoupon,
      };
    } else {
      return {
        message: "Could not create the coupon on shopify",
        status: 500,
      };
    }
  } catch (e) {
    return {
      message: e.message || "An error occurred while creating the coupon",
      status: 500,
    };
  }
};

export const GetCoupons = async (req) => {
  try {
    const { user, query } = req;
    const { limit = 10, skip = 0 } = query;

    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    }).lean();

    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }

    const coupons = await Coupons.find({ store: store._id, status: "active" })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      status: 200,
      message: "Coupons fetched successfully",
      data: coupons,
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "An error occurred while fetching coupons",
    };
  }
};
