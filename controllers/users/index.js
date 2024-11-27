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
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "user",
          as: "orders",
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          contactNumber: 1,
          city: "$address.state",
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
        $addFields: {
          orderCount: { $size: "$orders" },
        },
      },
      {
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
