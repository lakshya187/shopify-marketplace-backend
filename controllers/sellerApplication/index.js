import logger from "#common-functions/logger/index.js";
import SellerApplications from "#schemas/sellerApplications.js";
export const CreateSellerApplication = async (req) => {
  try {
    const { email, fullName, brandName, storeLink } = req.body;
    const newSellerApplication = new SellerApplications({
      brandName,
      email,
      fullName,
      storeLink,
    });
    const sellerApplication = await newSellerApplication.save();
    if (!sellerApplication) {
      throw new Error("Could not create seller application");
    }
    return {
      message: "Successfully created new seller application",
      status: 201,
    };
  } catch (e) {
    logger("error", "Error when crating seller application", e);
    return {
      message: e.message || "something went wrong",
      status: 500,
    };
  }
};
