import logger from "#common-functions/logger";
import fetch from "node-fetch";

const CreateProductStore = async ({ storeUrl, accessToken, productData }) => {
  const mutation = `
    mutation($input: ProductInput!) {
      productCreate(input: $input) {
        product {
          id
          title
          descriptionHtml
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      title: productData.title,
      descriptionHtml: productData.description,
      variants: productData.variants.map((variant) => ({
        title: variant.title,
        price: variant.price,
        sku: variant.sku,
      })),
    },
  };

  try {
    const response = await fetch(
      `https://${storeUrl}/admin/api/2023-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query: mutation, variables }),
      },
    );

    const result = await response.json();

    if (result.errors) {
      logger("error", "GraphQL errors:", result.errors);
      throw new Error(JSON.stringify(result.errors));
    }

    if (result.data.productCreate.userErrors.length > 0) {
      logger("error", "User errors:", result.data.productCreate.userErrors);
      throw new Error(JSON.stringify(result.data.productCreate.userErrors));
    }

    const createdProduct = result.data.productCreate.product;
    logger("info", "Product created:", createdProduct);
    return createdProduct;
  } catch (error) {
    logger("error", "Error creating product:", error);
    throw error;
  }
};

export default CreateProductStore;
