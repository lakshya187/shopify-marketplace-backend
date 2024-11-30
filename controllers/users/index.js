import Users from "#schemas/users.js";
import Stores from "#schemas/stores.js";
export const GetCustomerReport = async (req) => {
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
    const data = await Users.aggregate([
      {
        // Lookup orders for each user
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "user",
          as: "orders",
        },
      },
      {
        $unwind: {
          path: "$orders",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "orders.store": store._id,
        },
      },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          email: { $first: "$email" },
          contactNumber: { $first: "$contactNumber" },
          city: { $first: "$address.state" },
          orders: { $push: "$orders" },
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          contactNumber: 1,
          city: 1,
          orderCount: { $size: "$orders" },
          lifetimeSpending: {
            $sum: "$orders.amount",
          },
          latestOrderDate: {
            $arrayElemAt: [
              {
                $map: {
                  input: {
                    $sortArray: { input: "$orders", sortBy: { createdAt: -1 } },
                  },
                  as: "order",
                  in: "$$order.createdAt",
                },
              },
              0,
            ],
          },
        },
      },
    ]);

    return {
      data,
      status: 200,
      message: "Successfully fetched the customer report",
    };
  } catch (e) {
    return {
      error: e,
      status: 500,
    };
  }
};

export const GetUserOverview = async (req) => {
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

    const [data] = await Users.aggregate([
      {
        // Lookup orders for each user
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "user",
          as: "orders",
        },
      },
      {
        // Filter orders to include only those matching the specified store._id
        $addFields: {
          orders: {
            $filter: {
              input: "$orders",
              as: "order",
              cond: {
                $eq: ["$$order.store", store._id], // Replace with actual store._id
              },
            },
          },
        },
      },
      {
        // Match users who have at least one order for the store
        $match: {
          "orders.0": { $exists: true },
        },
      },
      {
        // Add a computed field for order count
        $addFields: {
          orderCount: { $size: "$orders" },
        },
      },
      {
        // Group to calculate total users, repeat customers, and new customers
        $group: {
          _id: null,
          total_users: { $sum: 1 },
          repeat_customers: {
            $sum: { $cond: [{ $gt: ["$orderCount", 1] }, 1, 0] },
          },
          new_customers: {
            $sum: { $cond: [{ $eq: ["$orderCount", 1] }, 1, 0] },
          },
        },
      },
      {
        // Project the final result
        $project: {
          _id: 0,
          total_users: 1,
          repeat_customers: 1,
          new_customers: 1,
        },
      },
    ]);
    return {
      data: data,
      message: "Successfully fetched the user overview.",
      status: 200,
    };
  } catch (e) {
    return {
      error: e,
      status: 500,
    };
  }
};
