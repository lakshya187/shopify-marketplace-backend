import Stores from "#schemas/stores.js";
import Orders from "#schemas/orders.js";

export const GetOrders = async (req) => {
  try {
    const { user } = req;
    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    });
    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }
    const { skip, limit } = req.query;

    const bundles = await Orders.find({
      store: store._id,
    })
      .skip(Number(skip) || 0)
      .limit(Number(limit) || 10)
      .sort({ createdAt: -1 });

    return {
      data: bundles,
      message: "Successfully fetched the Orders of the store.",
      status: 200,
    };
  } catch (e) {
    return {
      message: e,
      status: 500,
    };
  }
};

export const GetOrdersOverview = async (req) => {
  try {
    const { user } = req;
    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    });
    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }
    const [data] = await Orders.aggregate([
      {
        $match: {
          store: store._id,
        },
      },
      {
        $lookup: {
          from: "bundles",
          localField: "bundle",
          foreignField: "_id",
          as: "bundleDetails",
        },
      },
      {
        $unwind: {
          path: "$bundleDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$store", // Group by store
          totalRevenue: { $sum: "$amount" },
          totalCostOfGoods: { $sum: "$bundleDetails.costOfGoods" },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          delivered: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
          },
          shipped: {
            $sum: { $cond: [{ $eq: ["$status", "shipped"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          salesSummary: {
            total_revenue: { $round: ["$totalRevenue", 2] },
            net_revenue: {
              $round: [
                { $subtract: ["$totalRevenue", "$totalCostOfGoods"] },
                2,
              ],
            },
          },
          orderSummary: {
            pending: "$pending",
            delivered: "$delivered",
            shipped: "$shipped",
          },
        },
      },
    ]);
    return {
      data,
      status: 200,
      message: "Overview fetched successfully",
    };
  } catch (e) {
    return {
      message: e,
      status: 500,
    };
  }
};
