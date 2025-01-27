import StoreBoxes from "#schemas/storeBoxes.js";
import Stores from "#schemas/stores.js";

export const GetStoreBoxInventory = async (req) => {
  try {
    const { user } = req;
    const store = await Stores.findOne({ storeUrl: user.storeUrl }).lean();
    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }

    const [storeBoxInventory] = await StoreBoxes.find({ store: store._id })
      .populate({
        path: "inventory.box",
      })
      .lean();
    if (!storeBoxInventory) {
      return {
        status: 200,
        message: "Successfully fetched the Box store inventory",
        data: null,
      };
    }
    let totalBoxes = 0;
    let totalBoxesUsed = 0;
    storeBoxInventory?.inventory.forEach((inventory) => {
      totalBoxes += inventory.remaining;
      totalBoxesUsed += inventory.used;
    });
    storeBoxInventory.totalUsed = totalBoxesUsed;
    storeBoxInventory.totalRemaining = totalBoxes;

    return {
      status: 200,
      message: "Successfully fetched the Box store inventory",
      data: storeBoxInventory,
    };
  } catch (e) {
    return {
      message: e.message || "An unexpected error occurred",
      status: 500,
    };
  }
};

export const GetStoreBoxInventoryWithStoreId = async (req) => {
  try {
    const { storeUrl } = req.query;
    if (!storeUrl) {
      throw new Error("Store url not provided");
    }
    const store = await Stores.findOne({
      storeUrl,
    });
    if (!store) {
      throw new Error("Store not found");
    }
    const storeBoxInventory = await StoreBoxes.findOne({ store: store._id })
      .populate({
        path: "inventory.box",
      })
      .lean();

    return {
      data: storeBoxInventory,
      status: 200,
      message: "successfully fetched the storebox inventory for the store.",
    };
  } catch (e) {
    return {
      status: 500,
      message: e.message || "Something went wrong",
    };
  }
};
