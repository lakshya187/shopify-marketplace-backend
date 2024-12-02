// export const BASIC_AUTH_SCOPE = `${
//   process.env.NODE_ENV === "production"
//     ? "read_all_orders, read_products, write_products, read_inventory, read_orders, write_orders"
//     : ""
// }read_orders, write_orders, read_customers, write_customers, read_discounts, write_discounts, write_script_tags, read_draft_orders, write_draft_orders, read_fulfillments, read_shipping`;

export const BASIC_AUTH_SCOPE = `read_products, write_products, read_inventory, read_orders, write_orders, write_files, write_draft_orders, read_customers, customer_write_customers, write_publications, read_locations, write_inventory, write_inventory, write_discounts, read_discounts`;
export const INTERNAL_STORES = [process.env.INTERNAL_STORE];
