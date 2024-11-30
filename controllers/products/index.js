import Stores from "#schemas/stores.js";
import SearchProductOnShopify from "#common-functions/shopify/getStoreProducts.js";

export const GetProducts = async (req) => {
  try {
    const { user } = req;
    const { skip, limit } = req.query;

    const store = await Stores.findOne({ storeUrl: user.storeUrl }).lean();

    const data = await SearchProductOnShopify({
      accessToken: store.accessToken,
      shopName: store.shopName,
      afterCursor: skip,
      limit,
    });
    return {
      status: 200,
      data,
      message: "Store products fetched successfully",
    };
  } catch (e) {
    return { status: 400, message: e };
  }
};
