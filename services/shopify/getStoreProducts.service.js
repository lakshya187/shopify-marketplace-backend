import logger from "../../common-functions/logger/index.js";
const GetProductStore = async ({
  shopName,
  numOfProducts = 10,
  accessToken,
}) => {
  if (!shopName || !accessToken) {
    throw new Error("Parameters missing");
  }
  const query = `
    query {
      products(first: ${numOfProducts}) {
        edges {
          node {
            id
            title
            descriptionHtml
            description
            vendor
            productType
            tags
            images(first: 3) {
          edges {
            node {
              src
              altText
            }
          }
        }
        variants(first: 3) {
          edges {
            node {
              id
              title
              price
              sku
              inventoryQuantity
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
      `Successfully fetched the product info for store ${shopName}`,
      { data: result.data.products.edges },
    );
    return {
      data: result.data.products.edges,
      success: true,
    };
  } catch (e) {
    logger("error", "Error fetching products", e);
    return {
      error: e,
      success: false,
    };
  }
};

export default GetProductStore;
