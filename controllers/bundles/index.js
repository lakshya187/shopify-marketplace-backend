import fs from "fs";
import { GoogleAuth } from "google-auth-library";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

import Bundles from "#schemas/bundles.js";
import Stores from "#schemas/stores.js";
import Products from "#schemas/products.js";
import Categories from "#schemas/categories.js";
import GoogleBigQuery from "#common-functions/big-query/index.js";
import executeShopifyQueries from "#common-functions/shopify/execute.js";
import {
  CREATE_PRODUCT_OPTIONS,
  DELETE_PRODUCT,
  DELETE_PRODUCT_OPTIONS,
  GET_PRODUCT_DETAILS,
  GET_PRODUCT_MEDIA,
  PRODUCT_DELETE_MEDIA,
  PRODUCT_VARIANT_BULK_UPDATE,
  PRODUCT_VARIANTS_CREATE,
  STAGED_UPLOADS_CREATE,
  UPDATE_PRODUCT_WITH_NEW_MEDIA,
} from "#common-functions/shopify/queries.js";
import logger from "#common-functions/logger/index.js";

const bigQueryClient = new GoogleBigQuery(process.env.GCP_PROJECT_ID);

export const CreateBundle = async (req) => {
  try {
    const {
      name,
      description,
      components,
      price,
      tags,
      // discount,
      metadata,
      costOfGoods,
      // isOnSale,
      images,
      coverImage,
      status,
      inventory,
      trackInventory,
      category,
      box,
      vendor,
      sku,
      compareAtPrice,
      options,
    } = req.body;
    const { user } = req;

    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    }).lean();

    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }

    const bundleComponents = [];
    const productIds = components.map((p) => p.productId);
    const bundleProducts = await Products.find({
      _id: { $in: productIds },
    }).lean();

    if (!store?.logo) {
      return {
        message:
          "Cannot find the store logo. Make sure to upload the logo before creating bundles",
        status: 400,
      };
    }
    // converting the bundleProduct Array to object for better search time complexity
    const bundleProductMap = covertArrayToMap("_id", bundleProducts);
    // updating the product's dimensions and creating the bundle components
    const products = await Promise.all(
      components
        .map(async (productObj) => {
          const product = bundleProductMap[productObj.productId];
          if (!product) {
            return null;
          }
          const isVariantValid = product.variants.find(
            (v) => v.id === productObj.variantId,
          );

          if (product && isVariantValid) {
            const dimensions = {
              length: productObj.dimensions.length,
              weight: productObj.dimensions.weight,
              width: productObj.dimensions.width,
              height: productObj.dimensions.height,
            };
            bundleComponents.push({
              product: product._id,
              variant: isVariantValid,
            });
            return Products.findByIdAndUpdate(product._id, dimensions);
          }
          return null;
        })
        .filter(Boolean),
    );

    if (components.length !== products.length) {
      return {
        message: "Not all the product ids provided are valid",
        status: 400,
      };
    }
    const doesCategoryExists = await Categories.findById(category).lean();
    if (!doesCategoryExists) {
      return {
        message: "The category does not exists",
        status: 400,
      };
    }

    const staticImageUrl = process.env.PACKAGING_IMAGE;
    // const netPrice = Number(price) - Number(discount || 0);
    const bundle = new Bundles({
      name,
      description,
      store: store._id,
      price,
      tags: tags || [],
      // discount: discount || 0,
      metadata: metadata || {},
      costOfGoods,
      // isOnSale,
      images: [
        ...images,
        {
          url: staticImageUrl,
        },
      ],
      coverImage,
      profit: Number(price) - Number(costOfGoods),
      status,
      inventory,
      trackInventory,
      category,
      box,
      vendor,
      sku,
      components: bundleComponents,
      compareAtPrice,
      options,
    });
    const savedBundle = await bundle.save();
    return {
      status: 201,
      message: "Successfully created the bundle",
      data: savedBundle,
    };
  } catch (e) {
    logger("error", "Error when creating the bundle", e);
    return {
      status: 500,
      message: e,
    };
  }
};

export const GetBundles = async (req) => {
  try {
    const { user } = req;
    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    });
    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }
    const { page } = req.query;
    const limit = 10;
    const skip = (Number(page) - 1) * 10;

    const bundles = await Bundles.find({
      store: store._id,
      isTemp: false,
      isDeleted: false,
    })
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 });

    return {
      data: bundles,
      message: "Successfully fetched the Bundles",
      status: 200,
    };
  } catch (e) {
    return {
      message: e,
      status: 500,
    };
  }
};

export const GetSingleBundle = async (req) => {
  try {
    const { bundleId } = req.params;

    const { user } = req;
    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    }).lean();
    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }
    const [bundle] = await Bundles.find({
      _id: bundleId,
      store: store._id,
    })
      .populate({
        path: "components.product",
      })
      .lean();
    if (!bundle) {
      return {
        message: "Could not find the Bundle",
        status: 400,
      };
    }
    const components = bundle.components.map((c) => {
      return {
        product: c.product,
        variantId: c.variant.id,
        dimensions: {
          length: c.product.length,
          width: c.product.width,
          height: c.product.height,
          weight: c.product.weight,
        },
      };
    });
    bundle.components = components;
    return {
      data: bundle,
      status: 200,
      message: "Successfully fetched the bundle",
    };
  } catch (e) {
    return {
      message: e,
      status: 500,
    };
  }
};

export const DeleteSingleBundle = async (req) => {
  try {
    const { bundleId } = req.params;
    const { user } = req;
    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    }).lean();
    const marketPlace = await Stores.findOne({
      isActive: true,
      isInternalStore: true,
    });
    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }
    const [bundle] = await Bundles.find({
      store: store._id,
      _id: bundleId,
    }).lean();
    if (!bundle) {
      return {
        message: "No bundle found the provided id",
        status: 400,
      };
    }

    // remove the product from bq, delete the product from merchant, delete the product from marketplace and mark the product as deleted.

    try {
      await executeShopifyQueries({
        query: DELETE_PRODUCT,
        storeUrl: marketPlace.storeUrl,
        accessToken: marketPlace.accessToken,
        variables: {
          productId: bundle.shopifyProductId,
        },
      });
    } catch (error) {
      logger(
        "error",
        "[delete-single-bundle] Error deleting product from marketPlace store",
        error,
      );
    }

    try {
      await executeShopifyQueries({
        query: DELETE_PRODUCT,
        storeUrl: store.storeUrl,
        accessToken: store.accessToken,
        variables: {
          productId: bundle.metadata.vendorShopifyId,
        },
      });
    } catch (error) {
      logger(
        "error",
        "[delete-single-bundle] Error deleting product from vendor store",
        error,
      );
    }

    try {
      await Bundles.findByIdAndUpdate(bundleId, {
        isDeleted: true,
        deletedAt: new Date(Date.now()).toISOString(),
        status: "draft",
      });
    } catch (error) {
      logger(
        "error",
        "[delete-single-bundle] Error updating bundle deletion status",
        error,
      );
    }

    try {
      const searchQuery = `
    DELETE FROM  ${"`"}${process.env.GCP_PROJECT_ID}.${process.env.GCP_BQ_DATA_SET_ID}.${process.env.GCP_EMBEDDINGS_TABLE}${"`"} 
    WHERE id = '${bundleId}'
  `;
      await bigQueryClient.executeQuery(searchQuery);
    } catch (error) {
      logger(
        "error",
        "[delete-single-bundle] Error deleting bundle from BigQuery",
        error,
      );
    }

    return {
      message: "Bundle deleted successfully",
      status: 204,
    };
  } catch (e) {
    return {
      message: e,
      status: 500,
    };
  }
};

export const GenerateUploadUrl = async (req) => {
  try {
    const { filename, mimeType, fileSize } = req.body;
    const { user } = req;
    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    }).lean();
    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }
    let url;
    try {
      url = await executeShopifyQueries({
        query: STAGED_UPLOADS_CREATE,
        accessToken: store.accessToken,
        callback: (result) => {
          const { stagedUploadsCreate } = result.data;
          const urlObj = stagedUploadsCreate.stagedTargets[0];
          return urlObj;
        },
        storeUrl: store.storeUrl,
        variables: {
          input: [
            {
              filename,
              mimeType,
              fileSize,
              httpMethod: "PUT",
              resource: "FILE",
            },
          ],
        },
      });
    } catch (e) {
      logger("error", `[generate-upload-url]`, e);
      throw new Error(JSON.stringify(e));
    }

    return {
      data: url,
      status: 200,
      message: "Successfully generated image upload URLs",
    };
  } catch (e) {
    return {
      message: e,
      status: 500,
    };
  }
};

export const GetOverview = async (req) => {
  try {
    const { user } = req;
    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    }).lean();

    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }

    const [data] = await Bundles.aggregate([
      {
        $match: {
          store: store._id,
          isTemp: false,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          total_bundles: { $sum: 1 },
          total_bundles_value: { $sum: "$price" },
          total_active_bundles: {
            $sum: {
              $cond: [{ $eq: ["$status", "active"] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          total_bundles: 1,
          total_bundles_value: { $round: ["$total_bundles_value", 2] },
          total_active_bundles: 1,
        },
      },
    ]);
    if (data) {
      data.total_bundles_value = `₹${data?.total_bundles_value}`;
    }
    return {
      data,
      status: 200,
      message: "Successfully fetched the overview for bundles",
    };
  } catch (e) {
    return {
      message: e,
      status: 500,
    };
  }
};

export const UpdateBundle = async (req) => {
  try {
    const {
      name,
      description,
      components,
      price,
      tags,
      costOfGoods,
      images,
      coverImage,
      status,
      inventory,
      trackInventory,
      category,
      box,
      vendor: vendorName,
      sku,
      compareAtPrice,
      options,
    } = req.body;
    const { user } = req;
    const { id } = req.params;

    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    }).lean();

    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }
    const [internalStore] = await Stores.find({
      isInternalStore: true,
    });
    if (!internalStore) {
      return {
        status: 400,
        message: "No internal store exists",
      };
    }
    const doesBundleExists = await Bundles.findById(id)
      .populate("store")
      .lean();

    if (!doesBundleExists) {
      return {
        message: "Bundle id is not valid",
        status: 400,
      };
    }

    const bundleComponents = [];
    const productIds = components.map((p) => p.productId);

    const bundleProducts = await Products.find({
      _id: { $in: productIds },
    }).lean();
    const bundleProductMap = covertArrayToMap("_id", bundleProducts);
    const products = await Promise.all(
      components
        .map(async (productObj) => {
          const product = bundleProductMap[productObj.productId];
          if (!product) {
            return null;
          }
          const isVariantValid = product.variants.find(
            (v) => v.id === productObj.variantId,
          );

          if (product && isVariantValid) {
            const dimensions = {
              length: productObj.dimensions.length,
              weight: productObj.dimensions.weight,
              width: productObj.dimensions.width,
              height: productObj.dimensions.height,
            };
            bundleComponents.push({
              product: product._id,
              variant: isVariantValid,
            });
            return Products.findByIdAndUpdate(product._id, dimensions);
          }
        })
        .filter(Boolean),
    );
    const doesCategoryExists = await Categories.findById(category);
    if (!doesCategoryExists) {
      return {
        message: "The category does not exists",
        status: 400,
      };
    }
    if (components.length !== products.length) {
      return {
        message: "Not all the product ids provided are valid",
        status: 400,
      };
    }

    const bundleUpdateObj = {
      price,
      tags,
      costOfGoods,
      images,
      coverImage,
      status,
      inventory,
      trackInventory,
      name,
      description,
      category,
      box,
      sku,
      components: bundleComponents,
      vendor: vendorName,
      compareAtPrice,
      options,
    };

    // update the bundle on merchant, marketplace, db
    const updatedBundle = await Bundles.findByIdAndUpdate(id, bundleUpdateObj, {
      new: true,
    })
      .populate("category")
      .populate({ path: "components.product" })
      .populate("box")
      .populate({
        path: "options.product",
      })
      .lean();

    const inventoryDelta = updatedBundle.inventory - doesBundleExists.inventory;
    if (!doesBundleExists.shopifyProductId) {
      return {
        status: 200,
        message: "Bundle updated successfully",
      };
    }
    const marketPlace = await updateProduct({
      accessToken: internalStore.accessToken,
      shopName: internalStore.shopName,
      bundle: updatedBundle,
      productId: doesBundleExists.shopifyProductId,
      inventoryDelta,
      storeUrl: internalStore.storeUrl,
      storeLogo: store.logo,
    });
    let vendor;
    if (doesBundleExists.metadata?.vendorShopifyId) {
      vendor = await updateProduct({
        accessToken: store.accessToken,
        shopName: store.shopName,
        bundle: updatedBundle,
        productId: doesBundleExists.metadata.vendorShopifyId,

        inventoryDelta,
        storeUrl: store.storeUrl,
        isVendorProduct: true,
        storeLogo: store.logo,
      });
    }
    const variantMapping = {};
    marketPlace.variantMapping.forEach((mVariant) => {
      const vendorVariant = vendor.variantMapping.find(
        (vVariant) => vVariant.title === mVariant.title,
      );
      if (vendorVariant) {
        variantMapping[mVariant.id] = vendorVariant;
      }
    });

    const newMetaData = { ...updatedBundle.metadata };

    newMetaData.variantMapping = variantMapping;

    await Bundles.findByIdAndUpdate(updatedBundle._id, {
      metadata: newMetaData,
    });

    return {
      status: 200,
      message: "Bundle updated successfully on merchant and marketplace.",
    };
  } catch (e) {
    return {
      message: e,
      status: 500,
    };
  }
};

export const FetchInventoryOverview = async (req) => {
  try {
    const { user } = req;
    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    }).lean();

    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }
    const [data] = await Bundles.aggregate([
      {
        $match: {
          store: store._id,
          isDeleted: false,
          isTemp: false,
        },
      },
      {
        $group: {
          _id: null,
          out_of_stock: {
            $sum: { $cond: [{ $eq: ["$inventory", 0] }, 1, 0] },
          },
          low_stock: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$inventory", 0] },
                    { $lt: ["$inventory", 10] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);
    if (data) {
      delete data._id;
    }
    return {
      data,
      message: "Successfully fetched the inventory overview.",
      status: 200,
    };
  } catch (e) {
    return {
      message: e,
      status: 500,
    };
  }
};

export const AISearch = async (req) => {
  try {
    const { authorization } = req.headers;
    if (!authorization || authorization !== process.env.SHOPIFY_STORE_SECRET) {
      return {
        status: 401,
        message: "You are not allowed to access this resource.",
      };
    }
    const { query, numberOfResults } = req;
    const searchQuery = `
        SELECT DISTINCT base.content , base.id
          FROM VECTOR_SEARCH(
            TABLE ${"`"}${process.env.GCP_PROJECT_ID}.${
              process.env.GCP_BQ_DATA_SET_ID
            }.${process.env.GCP_EMBEDDINGS_TABLE}${"`"},
            'embeddings',
            (
                SELECT  ml_generate_embedding_result
                FROM ML.GENERATE_EMBEDDING(
                MODEL ${"`"}${process.env.GCP_PROJECT_ID}.${
                  process.env.GCP_BQ_DATA_SET_ID
                }.${process.env.GCP_MODEL_ID}${"`"},
                (SELECT '''${query.query}''' AS content))
            ),
          top_k => ${
            numberOfResults ?? 5
          }, options => '{"fraction_lists_to_search": 1}'
        )
        `;
    const aiResult = await bigQueryClient.executeQuery(searchQuery);
    const bundleIds = aiResult.map((r) => r.id);
    const bundles = await Bundles.find({ _id: { $in: bundleIds } }).lean();

    return {
      data: bundles,
      message: "Successfully ran the AI search",
      status: 200,
    };
  } catch (e) {
    return { status: 500, message: e };
  }
};

export const HandleConversation = async (req) => {
  try {
    // const { authorization } = req.headers;
    // if (!authorization || authorization !== process.env.SHOPIFY_STORE_SECRET) {
    //   return {
    //     status: 401,
    //     message: "You are not allowed to access this resource.",
    //   };
    // }
    const { prompt } = req.body;
    const query = `SELECT
    ml_generate_text_result
    FROM
    ML.GENERATE_TEXT(MODEL ${"`"}${process.env.GCP_PROJECT_ID}.${process.env.GCP_BQ_DATA_SET_ID}.${process.env.GCP_GEMINI_MODEL_ID}${"`"},
    (select '''${prompt}''' AS prompt),
    STRUCT(
      ${process.env.GCP_GEMINI_MODEL_TEMPERATURE} AS temperature, 
      ${process.env.GCP_GEMINI_MODEL_MAX_TOKENS} AS max_output_tokens 
    )
  );
  `;
    const [rawResponse] = await bigQueryClient.executeQuery(query);
    const parsedData = JSON.parse(rawResponse.ml_generate_text_result);
    const generatedText = parsedData.candidates[0]?.content?.parts[0]?.text;
    return {
      data: generatedText,
      message: "Successfully processed the prompt",
      status: 200,
    };
  } catch (e) {
    logger("error", "[handle-conversation]", e);
    return {
      error: e,
      status: 500,
    };
  }
};

export const GenerateImages = async (req) => {
  try {
    const { productIds } = req.body;
    const products = await Products.find({
      _id: { $in: productIds },
    }).lean();
    // const  = await
    const refinedPromptTemplate = `
You are an AI specialized in generating detailed and visually appealing prompts for product bundle cover images. 
Use the following product details to create a single, cohesive prompt that describes a high-quality image for a bundle featuring these items:

${products
  .map(
    (product, index) =>
      `Product ${index + 1}: 
       - Name: ${product.title} 
       - Description: ${product.description}`,
  )
  .join("\n\n")}

Ensure the prompt is creative, visually descriptive, and accurately represents a bundle containing these products. Also have a background of a giftbox which is of orange color with white ribbon. Dont add any text on the image.
`;
    const refinedPrompt = await HandleConversation({
      body: { prompt: refinedPromptTemplate },
    });

    const { token } = await getAccessToken();

    // const GOOGLE_PROJECT_ID = ;
    // const API_URL = `https://${process.env.GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/${process.env.GCP_LOCATION}/publishers/google/models/imagen-3.0-generate-002:predict`;
    const API_URL = `https://${process.env.GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${process.env.GCP_PROJECT_ID}/locations/${process.env.GCP_LOCATION}/publishers/google/models/imagen-3.0-generate-002:predict`;
    // const referenceImages = await Promise.all(
    //   products.map(async (product) => {
    //     const imageUrl = product.images[0].src; // Ensure your DB has image URLs
    //     const imageBuffer = await fetch(imageUrl).then((res) =>
    //       res.arrayBuffer(),
    //     );
    //     return Buffer.from(imageBuffer).toString("base64");
    //   }),
    // );
    let response;

    try {
      response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,

          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: refinedPrompt.data,
              image_format: "jpeg",
              aspect_ratio: "1:1",
              // image: referenceImages.map((base64Image) => ({
              //   bytesBase64Encoded: base64Image,
              // })),
            },
          ],
          parameters: {
            quality: "standard",
          },
        }),
      });
    } catch (e) {
      logger("error", "Error when generating images", e);
    }

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const imageData = data.predictions[0].bytesBase64Encoded;

    const imgBuffer = Buffer.from(imageData, "base64");

    const fileName = `generated-images/${uuidv4()}.jpg`;
    const imageUrl = await uploadToS3(imgBuffer, fileName);

    return {
      status: 201,
      message: "Successfully generated and uploaded the image",
      data: imageUrl,
    };
  } catch (error) {
    logger("error", "Error when generating images ", error);
    throw new Error("Image generation failed");
  }
};

//utility functions

async function uploadToS3(imageBuffer, fileName) {
  const s3 = new AWS.S3({
    region: process.env.AWS_REGION,
  });

  const params = {
    Bucket: process.env.FILE_UPLOAD_BUCKET,
    Key: fileName,
    Body: imageBuffer,
    ContentType: "image/jpeg",
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.Location);
      }
    });
  });
}

const getAccessToken = async () => {
  const auth = new GoogleAuth({
    keyFilename: process.env.GCP_SERVICE_ACCOUNT_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token;
};
const covertArrayToMap = (key, arr) => {
  const map = {};
  arr.forEach((item) => {
    map[item[key]] = item;
  });
  return map;
};

const updateProduct = async ({
  bundle,
  accessToken,
  storeUrl,
  productId,
  inventoryDelta,
  isVendorProduct,
  storeLogo,
}) => {
  // removing the existing media.
  let allMediaIds;

  try {
    allMediaIds = await executeShopifyQueries({
      accessToken,
      callback: (result) => {
        return result.data.product.media.edges.map((edge) => edge.node.id);
      },
      query: GET_PRODUCT_MEDIA,
      storeUrl,
      variables: {
        productId,
      },
    });
    logger("info", "Successfully fetched the product media");
  } catch (e) {
    logger("error", "[update-product] Could not find the product media", e);
  }

  try {
    await executeShopifyQueries({
      query: PRODUCT_DELETE_MEDIA,
      accessToken,
      storeUrl,
      variables: {
        mediaIds: allMediaIds,
        productId,
      },
      callback: null,
    });
    logger("info", "Successfully deleted the product media");
  } catch (e) {
    logger("error", "[update-product] Could not delete the product media", e);
  }
  // fetching the existing product for meta fields  TODO: Refactor this.
  let productDetails;
  try {
    productDetails = await executeShopifyQueries({
      accessToken,
      query: GET_PRODUCT_DETAILS,
      callback: (result) => {
        const product = result?.data?.product;
        return {
          metafields: product.metafields.edges.map(({ node }) => {
            return {
              id: node.id,
              namespace: node.namespace,
              key: node.key,
              value: node.value,
              description: node.value,
            };
          }),
          optionIds: product?.options.map((option) => option.id),
        };
      },
      storeUrl,
      variables: {
        id: productId,
      },
    });
    logger("info", "Successfully fetched the product details");
  } catch (e) {
    logger("error", "[update-product] Could not fetch the product details", e);
    throw e;
  }
  if (!productDetails) {
    throw new Error("[update-product] Could not fetch the product details");
  }

  // delete the current product options
  try {
    await executeShopifyQueries({
      accessToken,
      query: DELETE_PRODUCT_OPTIONS,
      storeUrl,
      variables: {
        productId: productId,
        options: productDetails.optionIds,
        strategy: "POSITION",
      },
    });
    logger("info", "Successfully deleted the existing variants");
  } catch (e) {
    logger("error", "[update-product] Could not delete the product options", e);
  }

  // updating the existing product with new media and updated
  let product;
  try {
    product = await executeShopifyQueries({
      accessToken,
      query: UPDATE_PRODUCT_WITH_NEW_MEDIA,
      storeUrl,
      variables: {
        input: {
          id: productId,
          title: bundle.name,
          descriptionHtml: bundle.description,
          tags: bundle.tags || [],
          vendor: bundle.vendor ?? "",
          status: isVendorProduct ? "DRAFT" : bundle.status?.toUpperCase(),
          category: bundle.category?.category?.id,
          metafields: [
            buildProductMetaObj({
              productDetails,
              bundle,
              storeLogo,
              storeId: bundle.store._id,
            }),
          ],
        },
        media: buildMediaObject(bundle),
      },
      callback: (result) => {
        return result.data.productUpdate.product;
      },
    });
    logger("info", "[update-product] Successfully updated the product");
  } catch (e) {
    logger("error", "[update-product] Could not update the product", e);
  }

  // creating new product variants
  const productOptionsObj = buildOptionsObjs(bundle.options);
  try {
    await executeShopifyQueries({
      query: CREATE_PRODUCT_OPTIONS,
      accessToken,
      storeUrl,
      variables: {
        productId: productId,
        options: productOptionsObj,
      },
    });
  } catch (e) {
    logger("error", "[update-product] Could not create product options");
    throw e;
  }
  // creating new product options
  const possibleOptions = generateAllCombinations({
    options: productOptionsObj,
  });

  const variantObjs = buildVariantObjs({
    combinations: possibleOptions.slice(1),
    compareAtPrice: bundle.compareAtPrice,
    price: bundle.price,
  });

  if (variantObjs.length) {
    try {
      await executeShopifyQueries({
        accessToken,
        query: PRODUCT_VARIANTS_CREATE,
        storeUrl,
        variables: {
          productId: product.id,
          variants: variantObjs,
        },
      });
      logger("info", "Successfully created new variants");
    } catch (e) {
      logger(
        "error",
        `[update-product] Could add the product packaging option`,
        e,
      );
    }
  }
  const defaultVariant = product.variants?.edges?.[0]?.node;
  // update the default variant
  try {
    await executeShopifyQueries({
      query: PRODUCT_VARIANT_BULK_UPDATE,
      accessToken,
      storeUrl,
      variables: {
        productId: product.id,
        variants: {
          id: defaultVariant.id,
          price: bundle.price,
          compareAtPrice: bundle.compareAtPrice,
          inventoryPolicy: "CONTINUE",
        },
      },
    });
  } catch (e) {
    logger("error", "[update-product] Could not update the default variant");
    throw e;
  }

  const variantMapping = [];
  try {
    await executeShopifyQueries({
      accessToken,
      query: GET_PRODUCT_DETAILS,
      storeUrl,
      variables: {
        id: product.id,
      },
      callback: (result) => {
        const product = result?.data?.product;
        return {
          variants: product.variants.edges.map(({ node }) => {
            variantMapping.push({
              id: node.id,
              title: node.title,
            });
          }),
        };
      },
    });
    logger("info", "Successfully fetched the product variants");
  } catch (e) {
    logger("error", `[update-product] Could fetch the product variants`, e);
    throw e;
  }
  return {
    variantMapping,
  };
};

const buildMediaObject = (bundle) => {
  const media = [];
  if (bundle.coverImage) {
    media.push({
      mediaContentType: "IMAGE",
      originalSource: bundle.coverImage.url,
      alt: `Cover image for ${bundle.name}`,
    });
  }
  if (bundle.images && bundle.images.length > 0) {
    bundle.images.forEach((imageUrl, index) => {
      media.push({
        mediaContentType: "IMAGE",
        originalSource: imageUrl.url,
        alt: `Additional image ${index + 1} for ${bundle.name}`,
      });
    });
  }
  return media;
};

const buildProductMetaObj = ({
  productDetails,
  bundle,
  storeLogo,
  storeId,
}) => {
  const componentField = productDetails.metafields.find(
    (field) => field.key === "bundle_components",
  );

  const baseValue = JSON.stringify({
    products: bundle.components,
    box: bundle.box,
    storeLogo,
    storeId,
  });

  return componentField
    ? { id: componentField.id, value: baseValue }
    : {
        namespace: "custom",
        key: "bundle_components",
        value: baseValue,
        type: "json_string",
      };
};

const buildOptionsObjs = (options) => {
  const allOptions = [];
  if (options && options.length) {
    options.forEach((bundleOption) => {
      const { title: productName } = bundleOption.product;
      bundleOption.options.forEach((option) => {
        const optionName = `${productName} ${option.name}`;
        const values = option.values.map((v) => {
          return { name: v };
        });
        allOptions.push({
          name: optionName,
          values: values,
        });
      });
    });
  }
  return allOptions;
};

const buildVariantObjs = ({ combinations, price, compareAtPrice }) => {
  return combinations.map((comb) => {
    return {
      optionValues: comb,
      price,
      inventoryPolicy: "CONTINUE",
      compareAtPrice,
    };
  });
};

const generateAllCombinations = ({ options }) => {
  // Map options into arrays of their values with associated names
  const mappedOptions = options.map((option) =>
    option.values.map((value) => ({
      name: value.name,
      optionName: option.name,
    })),
  );
  // Compute Cartesian Product of all options
  return cartesianProduct(mappedOptions);
};

const cartesianProduct = (arr) => {
  return arr.reduce(
    (acc, curr) => acc.flatMap((x) => curr.map((y) => [...x, y])),
    [[]],
  );
};
