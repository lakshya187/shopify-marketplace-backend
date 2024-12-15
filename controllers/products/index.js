import Stores from "#schemas/stores.js";
import SearchProductOnShopify from "#common-functions/shopify/getStoreProducts.js";
import Products from "#schemas/products.js";
export const GetProducts = async (req) => {
  try {
    const { user } = req;
    const { page = 1, search } = req.query;

    const limit = 10;
    const skip = (Number(page) - 1) * limit;
    const store = await Stores.findOne({ storeUrl: user.storeUrl }).lean();
    const query = {
      store: store._id,
    };

    if (search) {
      query.$text = { $search: search };
    }
    const data = await Products.find(query).limit(limit).skip(skip).lean();
    return {
      status: 200,
      data,
      message: "Store products fetched successfully",
    };
  } catch (e) {
    return { status: 400, message: e };
  }
};
