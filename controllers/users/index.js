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

    const { page = 1 } = req.query;
    const limit = 10;
    const skip = (Number(page) - 1) * limit;

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
      {
        $skip: skip,
      },
      {
        $limit: limit,
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
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "user",
          as: "orders",
        },
      },
      {
        $addFields: {
          orders: {
            $filter: {
              input: "$orders",
              as: "order",
              cond: {
                $eq: ["$$order.store", store._id],
              },
            },
          },
        },
      },
      {
        $match: {
          "orders.0": { $exists: true },
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
          lifetime_customers: { $sum: 1 },
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
          lifetime_customers: 1,
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
