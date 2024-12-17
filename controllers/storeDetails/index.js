import StoreDetails from "#schemas/storeDetails.js";
import Stores from "#schemas/stores.js";

export const GetStoreDetails = async (req) => {
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
    let data = null;
    const [storeDetails] = await StoreDetails.find({ store: store._id }).lean();
    if (!storeDetails) {
      const newStoreDetails = new StoreDetails({
        businessName: store.shopName,
        displayName: store.shopName,
        description: "",
        addressLine1: store.address1,
        addressLine2: store.address2,
        contactNumber: store.phoneNumber,
        documents: [],
        email: store.primaryEmail,
        gstNumber: "",
        landmark: "",
        pincode: store.provinceCode,
        registrationNumber: "",
        state: "",
        store: store._id,
      });
      data = await newStoreDetails.save();
    } else {
      data = storeDetails;
    }
    return {
      data,
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

export const UpdateStoreDetails = async (req) => {
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
      displayName,
      description,
      contactNumber,
      email,
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
      displayName,
      description,
      contactNumber,
      email,
      addressLine1,
      addressLine2,
      landmark,
      pincode,
      state,
      gstNumber,
      registrationNumber,
      documents,
      logo,
    };

    const updatedStore = await StoreDetails.findOneAndUpdate(
      { store: store._id },
      updateObj,
      { new: true },
    );

    return {
      message: "Store details updated successfully",
      status: 200,
      data: updatedStore,
    };
  } catch (e) {
    console.error("Error updating store details:", e);
    return {
      message: "Internal server error",
      status: 500,
    };
  }
};
