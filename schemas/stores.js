import Mongoose from "#schemas/mongoose.js";

const StoreSchema = new Mongoose.Schema(
  {
    storeId: { type: String, required: true },
    storeUrl: { type: String, required: true },
    accessToken: { type: String, required: true },
    primaryEmail: { type: String, required: false },
    shopName: { type: String, required: false },
    shopOwner: { type: String, required: false },
    referrerAgency: { type: String, required: false },
    recurringApplicationChargeId: { type: String, required: false },
    billingCycle: { type: Date, required: false },
    address1: { type: String, required: false },
    address2: { type: String, required: false },
    zip: { type: String, required: false },
    city: { type: String, required: false },
    checkoutApiSupported: { type: Boolean, required: false },
    multiLocationEnabled: { type: Boolean, required: false },
    myShopifyDomain: { type: String, required: true },
    shopifyPlanName: { type: String, required: false },
    storeCustomerEmail: { type: String, required: false },
    storeEstablishedAt: { type: String, required: false },
    storePrimaryLocale: { type: String, required: false },
    phoneNumber: { type: String, required: false },
    source: { type: String, required: false },
    countryCode: { type: String, required: false },
    provinceCode: { type: String, required: false },
    domain: { type: String, required: false },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
    },
    owner: {
      type: Mongoose.Schema.Types.ObjectId,
      ref: "authentications",
      required: false,
    },
  },
  { timestamps: true },
);

export default Mongoose.model("stores", StoreSchema);
