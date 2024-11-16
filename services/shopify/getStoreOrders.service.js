import logger from "../../common-functions/logger/index.js";

const GetStoreOrders = async ({
  shopName,
  numOfOrders = 10, // Number of orders to fetch
  accessToken,
}) => {
  if (!shopName || !accessToken) {
    throw new Error("Parameters missing");
  }

  const query = `
   query {
  orders(first: ${numOfOrders}) {
    edges {
      node {
        id
        createdAt
        totalPriceSet {
          presentmentMoney {
            amount
            currencyCode
          }
        }
        lineItems(first: 10) {
          edges {
            node {
              title
              quantity
              id
              originalUnitPriceSet {
                presentmentMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
}
  `;

  const shopifyUrl = `https://${shopName}.myshopify.com/admin/api/2023-10/graphql.json`;

  try {
    const response = await fetch(shopifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();

    if (result.errors) {
      throw new Error(JSON.stringify(result.errors));
    }

    logger(
      "info",
      `Successfully fetched the order info for store ${shopName}`,
      { data: result.data.orders.edges },
    );

    const orders = result.data.orders.edges.map((order) => {
      return {
        orderId: order.node.id,
        totalPrice: order.node.totalPriceSet.presentmentMoney.amount, // Total price in the default currency
        currencyCode: order.node.totalPriceSet.presentmentMoney.currencyCode, // Currency of the total price
        lineItems: order.node.lineItems.edges.map((item) => ({
          title: item.node.title,
          quantity: item.node.quantity,
          unitPrice: item.node.originalUnitPriceSet.presentmentMoney.amount, // Unit price in the default currency
          currencyCode:
            item.node.originalUnitPriceSet.presentmentMoney.currencyCode, // Currency of the unit price
          id: item.node.id,
        })),
        numOfProducts: order.node.lineItems.edges.length, // Count of products in the order
      };
    });
    return {
      data: orders,
      success: true,
    };
  } catch (e) {
    logger("error", "Error fetching orders", e);
    return {
      error: e,
      success: false,
    };
  }
};

export default GetStoreOrders;
