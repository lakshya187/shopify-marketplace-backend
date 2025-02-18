import Stores from "#schemas/stores.js";
import Orders from "#schemas/orders.js";
import executeShopifyQueries from "#common-functions/shopify/execute.js";
import { CANCEL_ORDER } from "#common-functions/shopify/queries.js";

/*
{
  payment : "paid" | "pending" | "refunded",
  status : "pending" | 'fulfilled' | 'cancelled',
}
*/

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
    const { page, paymentStatus, status } = req.query;
    const filter = buildFilterQuery({ paymentStatus, status });

    const limit = 10;
    const skip = (Number(page) - 1) * limit;

    const orders = await Orders.find({
      store: store._id,
      ...filter,
    })
      .populate("user")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return {
      data: orders,
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
          _id: "$store",
          totalRevenue: {
            $sum: {
              $cond: [{ $ne: ["$status", "cancelled"] }, "$amount", 0],
            },
          },
          total: {
            $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, 1, 0] },
          },
          fulfilled: {
            $sum: { $cond: [{ $eq: ["$status", "fulfilled"] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          salesSummary: {
            total_sales: { $round: ["$totalRevenue", 2] },
            net_balance: {
              $round: ["$totalRevenue", 2],
            },
          },
          orderSummary: {
            total: "$total",
            fulfilled: "$fulfilled",
            pending: "$pending",
          },
        },
      },
    ]);
    if (data) {
      data.salesSummary.total_sales = `₹${formatNumber(
        data.salesSummary?.total_sales,
      )}`;
      data.salesSummary.net_balance = `₹${formatNumber(
        Number(data.salesSummary?.net_balance) * (1 - store.commission / 100),
      )}`;
    }

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

export const CancelOrder = async (req) => {
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
    const { id } = req.params;
    const [doesOrderExists] = await Orders.find({ _id: id, store: store._id })
      .populate("store")
      .lean();
    if (!doesOrderExists) {
      return {
        status: 400,
        message: "The order does not exists",
      };
    }
    await Promise.all([
      Orders.findByIdAndUpdate(id, { status: "cancelled" }),
      executeShopifyQueries({
        accessToken: doesOrderExists.store.accessToken,
        query: CANCEL_ORDER,
        variables: {
          notifyCustomer: true,
          orderId: doesOrderExists.orderShopifyId,
          reason: "CUSTOMER",
          refund: true,
          restock: true,
          staffNote: "",
        },
        storeUrl: doesOrderExists.store.storeUrl,
      }),
    ]);

    return {
      status: 200,
      message: "Successfully cancelled the order",
    };
  } catch (e) {
    return {
      status: 500,
      message: e,
    };
  }
};

const formatNumber = (num) => {
  return num.toLocaleString("en-IN");
};

const buildFilterQuery = (queryObj) => {
  const filter = {};
  Object.entries(queryObj).forEach(([key, value]) => {
    if (value) {
      filter[key] = value;
    }
  });
  return filter;
};
