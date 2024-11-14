export const BASIC_AUTH_SCOPE = `${
  process.env.NODE_ENV === "production" ? "read_all_orders, " : ""
}read_orders, write_orders, read_customers, write_customers, read_discounts, write_discounts, write_script_tags, read_draft_orders, write_draft_orders, read_fulfillments, read_shipping`;
