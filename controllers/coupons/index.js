import executeShopifyQueries from "#common-functions/shopify/execute.js";
import {
  CREATE_COUPON,
  DELETE_COUPON,
} from "#common-functions/shopify/queries.js";
import Bundles from "#schemas/bundles.js";
import Coupons from "#schemas/coupons.js";
import Stores from "#schemas/stores.js";
import logger from "#common-functions/logger/index.js";

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
    const [internalStore] = await Stores.find({
      isActive: true,
      isInternalStore: true,
    }).lean();

    if (!internalStore) {
      return {
        message: "Internal store does not exists",
        status: 400,
      };
    }

    // Check if the code already exists
    const existingCoupon = await Coupons.findOne({ code });
    if (existingCoupon) {
      return {
        message: "A coupon with the same code already exits.",
        status: 400,
      };
    }

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

    // finding the products based off weather the user has selected products or all as applies to.
    const bundleFilter = {
      isCreatedOnShopify: true,
      isDeleted: false,
      isTemp: false,
    };
    if (appliesTo === "all") {
      bundleFilter["store"] = store._id;
    } else if (appliesTo === "products") {
      bundleFilter["_id"] = { $in: bundleIds };
      bundleFilter["store"] = store._id;
    }
    const bundles = await Bundles.find(bundleFilter).lean();
    const shopifyBundleIds = bundles.map((b) => b.shopifyProductId);
    couponObj.bundleIds = shopifyBundleIds;

    const dateRange = {};
    const customerGets = {
      value: {},
    };
    const minimumPurchaseAmountObj = {};
    if (couponObj.startsAt) {
      dateRange["startsAt"] = couponObj.startsAt;
    }
    if (couponObj.endsAt) {
      dateRange["endsAt"] = couponObj.endsAt;
    }

    if (couponObj.discountType === "percentage") {
      customerGets.value["percentage"] = Number(couponObj.discountValue) / 100;
    } else if (couponObj.discountType === "fixed_amount") {
      customerGets.value["discountAmount"] = {
        amount: Number(couponObj.discountValue),
        appliesOnEachItem: true,
      };
    }
    if (couponObj.minimumPurchaseAmount) {
      minimumPurchaseAmountObj["minimumRequirement"] = {
        subtotal: {
          greaterThanOrEqualToSubtotal: Number(couponObj.minimumPurchaseAmount),
        },
      };
    }
    const appliesToObj = {
      items: {
        products: {
          productsToAdd: couponObj.bundleIds,
        },
      },
    };
    // save the coupon in shopify
    const couponVariables = {
      basicCodeDiscount: {
        title: couponObj.title,
        code: couponObj.code,
        ...dateRange,
        customerSelection: {
          all: true,
        },
        customerGets: {
          ...customerGets,
          ...appliesToObj,
        },
        appliesOncePerCustomer: couponObj.appliesOncePerCustomer,
        usageLimit: Number(couponObj.usageLimit),
        ...minimumPurchaseAmountObj,
      },
    };

    const shopifyCoupon = await executeShopifyQueries({
      accessToken: internalStore.accessToken,
      storeUrl: internalStore.storeUrl,
      variables: couponVariables,
      query: CREATE_COUPON,
      callback: (result) => {
        const discountCodeNode =
          result.data.discountCodeBasicCreate.codeDiscountNode;

        const formattedResponse = {
          id: discountCodeNode.id,
          title: discountCodeNode.codeDiscount.title,
          code: discountCodeNode.codeDiscount.codes.nodes.map(
            (node) => node.code,
          ),
          startsAt: discountCodeNode.codeDiscount.startsAt,
          endsAt: discountCodeNode.codeDiscount.endsAt,
          appliesOncePerCustomer:
            discountCodeNode.codeDiscount.appliesOncePerCustomer,
          discountValue:
            discountCodeNode.codeDiscount.customerGets.value.percentage,
          appliesTo: discountCodeNode.codeDiscount.customerGets,
        };
        return formattedResponse;
      },
    });

    if (shopifyCoupon.id) {
      couponObj["shopifyId"] = shopifyCoupon.id;
      if (couponObj.appliesTo === "all") {
        delete couponObj.bundleIds;
      } else {
        couponObj.bundleIds = bundleIds;
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
    const { user } = req;
    const { page = 1 } = req.query;
    const limit = 10;
    const skip = (Number(page) - 1) * limit;

    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    }).lean();

    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }

    const coupons = await Coupons.find({
      store: store._id,
      status: "active",
      isDeleted: false,
    })
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

export const DeleteCoupon = async (req) => {
  try {
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
    const { id } = req.params;
    const doesCouponExists = await Coupons.findById(id).lean();
    if (!doesCouponExists) {
      return {
        message: "Coupon does not exists",
        status: 400,
      };
    }

    if (doesCouponExists.store.toString() !== store._id.toString()) {
      return {
        message: "You are not allowed to delete this resource",
        status: 401,
      };
    }
    const marketPlace = await Stores.findOne({
      isInternalStore: true,
      isActive: true,
    }).lean();
    await Promise.all([
      executeShopifyQueries({
        accessToken: marketPlace.accessToken,
        storeUrl: marketPlace.storeUrl,
        query: DELETE_COUPON,
        variables: {
          id: doesCouponExists.shopifyId,
        },
      }),
      Coupons.findByIdAndUpdate(doesCouponExists._id, {
        isDeleted: true,
      }),
    ]);

    logger("info", "Successfully deleted the coupon from marketplace.");
    return {
      message: "Successfully deleted the coupon",
      status: 204,
    };
  } catch (e) {
    return {
      status: 500,
      message: e.message || "Something went wrong",
    };
  }
};
