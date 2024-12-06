import Stores from "#schemas/stores.js";
import StoreBoxes from "#schemas/storeBoxes.js";
import StoreBoxOrders from "#schemas/storeBoxOrders.js";
import logger from "#common-functions/logger/index.js";

export const CreateStoreBoxOrder = async (req) => {
  try {
    const { orderItems } = req.body;

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

    let totalQuantity = 0;
    const orderMap = {};

    orderItems.forEach((item) => {
      if (!item.box || !item.quantity || Number(item.quantity) <= 0) {
        throw new Error(
          "Each order item must include a valid packaging ID and a positive quantity.",
        );
      }
      if (!orderMap[item.box]) {
        orderMap[item.box] = {
          box: item.box,
          quantity: 0,
        };
      }
      orderMap[item.box]["quantity"] += Number(item.quantity);
      totalQuantity += Number(item.quantity);
    });
    const mergedOrderItems = Object.values(orderMap);
    const newOrder = new StoreBoxOrders({
      store: store._id,
      orderItems: mergedOrderItems,
      totalQuantity,
    });

    const order = await newOrder.save();

    return {
      message: "Successfully created the store order.",
      status: 200,
      data: order,
    };
  } catch (e) {
    return {
      message: e.message || "An error occurred while creating the store order.",
      status: 500,
    };
  }
};

export const GetAllBoxOrders = async (req) => {
  try {
    const { user } = req;

    const { page = 1 } = req.query;
    const limit = 10;
    const skip = (Number(page) - 1) * limit;
    // Find the store based on the authenticated user's store URL
    const store = await Stores.findOne({ storeUrl: user.storeUrl }).lean();

    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }

    const boxOrders = await StoreBoxOrders.find({ store: store._id })
      .populate({
        path: "orderItems.box",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      status: 200,
      message: "Box orders retrieved successfully",
      data: boxOrders,
    };
  } catch (e) {
    return {
      status: 500,
      message: e.message || "An error occurred while fetching box orders",
    };
  }
};

export const UpdateStoreBoxOrder = async (req) => {
  try {
    const { user } = req;

    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    }).lean();
    if (!store.isInternalStore) {
      return {
        status: 401,
        message: "You are not allowed to modify this order",
      };
    }
    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }
    const { id } = req.params;
    const { status } = req.body;

    const doesBoxOrderExists = await StoreBoxOrders.findById(id)
      .populate({
        path: "orderItems.box",
      })
      .lean();

    if (!doesBoxOrderExists) {
      return {
        message: "The box order id does not exists",
        status: 400,
      };
    }
    const [storeBoxInventory] = await StoreBoxes.find({
      store: doesBoxOrderExists.store,
    }).lean();
    if (status === "delivered")
      if (storeBoxInventory) {
        // todo : complete this logic of store box inventory update
        const exitingBoxesUpdate = storeBoxInventory.inventory.map((box) => {
          const isBoxUpdated = doesBoxOrderExists.orderItems.find(
            (b) => b.box === box.box,
          );
        });

        const updateObj = {};
      } else {
        const storeBoxInventory = new StoreBoxes({
          store: doesBoxOrderExists.store,
          inventory: doesBoxOrderExists.orderItems,
        });
        const newStoreInventory = await storeBoxInventory.save();
        logger(
          "info",
          "Successfully Create new inventory for the store",
          newStoreInventory,
        );
      }
    await StoreBoxOrders.findByIdAndUpdate(doesBoxOrderExists._id, {
      status: "delivered",
    });
    return {
      message: "successfully approved and updated the store box inventory",
    };
  } catch (e) {
    return {
      message: e,
      status: 500,
    };
  }
};
