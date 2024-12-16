import Stores from "#schemas/stores.js";
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
    return { status: 500, message: e };
  }
};

export const GetProductOverview = async (req) => {
  try {
    const { user } = req;
    const store = await Stores.findOne({ storeUrl: user.storeUrl }).lean();

    const [data] = await Products.aggregate([
      {
        $match: {
          store: store._id,
        },
      },
      {
        $group: {
          _id: null,
          total_products: { $sum: 1 },
          out_of_stock: {
            $sum: { $cond: [{ $eq: ["$totalInventory", 0] }, 1, 0] },
          },
          low_inventory: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$totalInventory", 0] },
                    { $lt: ["$totalInventory", 10] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          total_products: 1,
          out_of_stock: 1,
          low_inventory: 1,
        },
      },
    ]);
    return {
      status: 200,
      data,
      message: "Product overview fetched successfully",
    };
  } catch (e) {
    return { status: 500, message: e };
  }
};
