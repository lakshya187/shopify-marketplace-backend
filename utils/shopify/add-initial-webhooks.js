import logger from "#common-functions/logger/index.js";
import axios from "axios";

const INITIAL_WEBHOOKS = [
  "orders/create",
  "orders/updated",
  "orders/delete",
  "orders/edited",
  "orders/paid",
  "orders/fulfilled",
  "orders/partially_fulfilled",
  "orders/cancelled",
  "products/create",
  "products/delete",
  "products/update",
];

const { PARTNER_EVENT_SOURCE_ARN } = process.env;

if (!PARTNER_EVENT_SOURCE_ARN) {
  logger("error", "PARTNER_EVENT_SOURCE_ARN not defined");
}

export default async function AddInitialWebhooks(storeUrl, accessToken) {
  const promiseArray = INITIAL_WEBHOOKS.map((topic) => {
    logger("info", `Adding webhook for ${topic}`);
    return axios({
      method: "POST",
      url: `https://${storeUrl}/admin/api/${process.env.SHOPIFY_API_V}/webhooks.json`,
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      data: {
        webhook: {
          topic,
          address: PARTNER_EVENT_SOURCE_ARN,
          format: "json",
        },
      },
    });
  });

  const result = await Promise.all(promiseArray);

  return result;
}
