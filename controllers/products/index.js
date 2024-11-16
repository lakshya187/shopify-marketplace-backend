import stores from "../../schemas/stores.js";
import GetProductStore from "../../services/shopify/getStoreProducts.service.js";

export const GetProducts = async (req) => {
  try {
    const { user } = req;
    const { skip, limit } = req.query;

    const store = await stores.findOne({ storeUrl: user.storeUrl }).lean();

    const data = await GetProductStore({
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
    return { status: 400, message: "Invalid token" };
  }
};

export const CreateProductsStore = async (req) => {
  try {
  } catch (e) {}
};
