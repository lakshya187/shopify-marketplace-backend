import Mongoose from "#schemas/mongoose";

const { Schema } = Mongoose;

const abandonCheckouts = new Schema(
  {
    abandoned_checkout_url: { type: String, required: true },
    first_name: { type: String, required: false },
    last_name: { type: String, required: false },
    country_code: { type: String, required: false },
    phone: { type: String, required: false },
    completed_at: { type: Date, required: false },
    shopify_created_at: { type: Date, required: false },
    customer_locale: { type: String, required: false },
    email: { type: String, required: false },
    checkout_id: { type: Number, required: true, index: true },
    total_price: { type: Number, required: true },
    shopify_updated_at: { type: Date, required: false },
    user_id: { type: Number, required: false },
    status: {
      type: String,
      required: true,
      enum: ["open", "closed"],
      default: "open",
    },
    storeUrl: { type: String, required: true },
    shortUrl: { type: String, required: false },
    usage_charge_id: { type: Schema.Types.Mixed, required: false },
    sent: {
      whatsapp: { type: Boolean },
      sms: { type: Boolean },
    },
    recovered: { type: Boolean, required: false },
    orderId: { type: Number, required: false },
    storeId: { type: Number, required: false },
  },
  { timestamps: { updatedAt: "updatedAt", createdAt: "createdAt" } },
);

export default Mongoose.model("abandoned_checkouts", abandonCheckouts);
