import Stores from "#schemas/stores.js";

export const GetStore = async (req) => {
  try {
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
    return {
      data: store,
      status: 200,
      message: "Successfully fetched the store details",
    };
  } catch (e) {
    return {
      message: e,
      status: 500,
    };
  }
};

export const UpdateStore = async (req) => {
  try {
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
    const {
      businessName,
      description,
      contactNumber,
      addressLine1,
      addressLine2,
      landmark,
      pincode,
      state,
      gstNumber,
      registrationNumber,
      documents,
      logo,
    } = req.body;

    // Create the update object
    const updateObj = {
      businessName,
      description,
      phoneNumber: contactNumber,
      address1: addressLine1,
      address2: addressLine2,
      landmark,
      zip: pincode,
      state,
      gstNumber,
      registrationNumber,
      // documents,
      logo,
    };

    const updatedStore = await Stores.findOneAndUpdate(
      { _id: store._id },
      updateObj,
      { new: true },
    );

    return {
      message: "Store details updated successfully",
      status: 201,
      data: updatedStore,
    };
  } catch (e) {
    logger("error", "Error updating store details:", e);
    return {
      message: "Internal server error",
      status: 500,
    };
  }
};
