import logger from "../../common-functions/logger/index.js";
import Bundle from "../../schemas/bundles.js";

const CreateProducts = async ({ productsData, storeId }) => {
  try {
    const productDocuments = productsData.data.map(({ node: product }) => {
      const variants = product.variants.edges.map((variant) => ({
        id: variant.node.id,
        title: variant.node.title,
        price: parseFloat(variant.node.price),
        sku: variant.node.sku,
        inventoryQuantity: variant.node.inventoryQuantity,
      }));

      const images = product.images.edges.map((image) => ({
        src: image.node.src,
        altText: image.node.altText,
      }));

      return {
        shopify_id: product.id,
        title: product.title,
        description_html: product.descriptionHtml,
        description: product.description,
        vendor: product.vendor,
        product_type: product.productType,
        tags: product.tags,
        images,
        variants,
        store: storeId,
      };
    });

    await Bundle.insertMany(productDocuments);
  } catch (error) {
    logger("error", "Error when creating the products", error);
  }
};

export default CreateProducts;
