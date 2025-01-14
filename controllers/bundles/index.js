import Bundles from "#schemas/bundles.js";
import Stores from "#schemas/stores.js";
import Products from "#schemas/products.js";
import Categories from "#schemas/categories.js";
import GoogleBigQuery from "#common-functions/big-query/index.js";
import executeShopifyQueries from "#common-functions/shopify/execute.js";
import {
  DELETE_PRODUCT,
  GET_PRODUCT_DETAILS,
  GET_PRODUCT_MEDIA,
  GET_PRODUCT_VARIANTS_INVENTORY,
  GET_STORE_LOCATION,
  INVENTORY_ADJUST_QUANTITIES,
  PRODUCT_DELETE_MEDIA,
  PRODUCT_VARIANT_BULK_UPDATE,
  STAGED_UPLOADS_CREATE,
  UPDATE_PRODUCT_WITH_NEW_MEDIA,
} from "#common-functions/shopify/queries.js";
import logger from "#common-functions/logger/index.js";
import StoreDetails from "#schemas/storeDetails.js";

const bigQueryClient = new GoogleBigQuery(process.env.GCP_PROJECT_ID);

export const CreateBundle = async (req) => {
  try {
    const {
      name,
      description,
      components,
      price,
      tags,
      discount,
      metadata,
      costOfGoods,
      isOnSale,
      images,
      coverImage,
      status,
      inventory,
      trackInventory,
      category,
      box,
      vendor,
      sku,
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
    const [storeDetails] = await StoreDetails.find({
      store: store._id,
    }).lean();

    if (!storeDetails || !storeDetails?.logo) {
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
      discount: discount || 0,
      metadata: metadata || {},
      costOfGoods,
      isOnSale,
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
    });
    const savedBundle = await bundle.save();
    return {
      status: 201,
      message: "Successfully created the bundle",
      data: savedBundle,
    };
  } catch (e) {
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
    try {
      await Promise.all([
        Bundles.findByIdAndDelete(bundleId),
        executeShopifyQueries({
          query: DELETE_PRODUCT,
          accessToken: store.accessToken,
          callback: null,
          storeUrl: store.storeUrl,
          variables: {
            productId: bundle.shopifyProductId,
          },
        }),
      ]);
    } catch (e) {
      logger(
        "error",
        "[delete-single-bundle] Error deleting from both shopify and db",
        e,
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
      discount,
      costOfGoods,
      isOnSale,
      images,
      coverImage,
      status,
      inventory,
      trackInventory,
      category,
      box,
      vendor: vendorName,
      sku,
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
      discount,
      costOfGoods,
      isOnSale,
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
    };

    // update the bundle on merchant, marketplace, db
    const updatedBundle = await Bundles.findByIdAndUpdate(id, bundleUpdateObj, {
      new: true,
    })
      .populate("category")
      .populate({ path: "components.product" })
      .populate("box")
      .lean();

    const storeDetails = await StoreDetails.findOne({
      store: store._id,
    });

    const inventoryDelta = updatedBundle.inventory - doesBundleExists.inventory;
    if (!doesBundleExists.shopifyProductId) {
      return {
        status: 200,
        message: "Bundle updated successfully",
      };
    }
    const marketPlace = updateProduct({
      accessToken: internalStore.accessToken,
      shopName: internalStore.shopName,
      bundle: updatedBundle,
      products: products,
      productId: doesBundleExists.shopifyProductId,
      inventoryDelta,
      storeUrl: internalStore.storeUrl,
      storeLogo: storeDetails.logo,
    });
    let vendor;
    if (doesBundleExists.metadata?.vendorShopifyId) {
      vendor = updateProduct({
        accessToken: store.accessToken,
        shopName: store.shopName,
        bundle: updatedBundle,
        productId: doesBundleExists.metadata.vendorShopifyId,
        products: products,
        inventoryDelta,
        storeUrl: store.storeUrl,
        isVendorProduct: true,
        storeLogo: storeDetails.logo,
      });
    }
    await Promise.all([marketPlace, vendor]);
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
                (SELECT '${query.query}' AS content))
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

//utility functions
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
        };
      },
      storeUrl,
      variables: {
        id: productId,
      },
    });
  } catch (e) {
    logger("error", "[update-product] Could not fetch the product details", e);
  }
  const componentField = productDetails.metafields.find((field) => {
    return field.key === "bundle_components";
  });
  const box = {};
  if (bundle.box) {
    box["price"] = bundle.box.price;
    box["size"] = bundle.box.sizes.size;
  }
  let upsertComponentObj = {};
  if (componentField) {
    upsertComponentObj["id"] = componentField.id;
    upsertComponentObj["value"] = JSON.stringify({
      products: bundle.components,
      box,
      storeLogo,
    });
  } else {
    upsertComponentObj["namespace"] = "custom";
    upsertComponentObj["key"] = "bundle_components";
    upsertComponentObj["value"] = JSON.stringify({
      products: bundle.components,
      box,
      storeLogo,
    });
    upsertComponentObj["type"] = "json_string";
  }

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
  const category = {};
  if (bundle?.category?.category?.id) {
    category["category"] = bundle.category.category.id;
  }
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
          status: !isVendorProduct ? "DRAFT" : bundle.status?.toUpperCase(),
          ...category,
          metafields: [upsertComponentObj],
        },
        media: media,
      },
      callback: (result) => {
        return result.data.productUpdate.product;
      },
    });
    logger("info", "[update-product] Successfully updated the product");
  } catch (e) {
    logger("error", "[update-product] Could not update the product", e);
  }
  const skuObj = {};
  if (bundle.sku) {
    skuObj["sku"] = bundle.sku;
  }
  let inventoryPolicy = "";
  if (bundle.trackInventory) {
    inventoryPolicy = "DENY";
  } else {
    inventoryPolicy = "CONTINUE";
  }

  const variantIds = [];
  const variants = product.variants.edges.map(({ node }) => {
    const isPackaging = node.title === "With Packaging";
    variantIds.push(node.id);
    const netPrice = Number(bundle.price) - Number(bundle.discount);
    return {
      id: node.id,
      compareAtPrice: isPackaging
        ? bundle.price + (bundle.box?.price ?? 0)
        : bundle.price,
      price: isPackaging ? netPrice + (bundle.box?.price ?? 0) : netPrice,
      inventoryItem: {
        tracked: bundle.trackInventory,
        sku: isPackaging ? `${bundle.sku}_P` : bundle.sku,
      },
      inventoryPolicy,
    };
  });
  try {
    await executeShopifyQueries({
      accessToken,
      storeUrl,
      variables: {
        productId,
        variants,
      },
      query: PRODUCT_VARIANT_BULK_UPDATE,
      callback: null,
    });
    logger("info", "Successfully Updated the product variant");
  } catch (e) {
    logger("error", "[update-product] Could not update the product variant");
  }
  let locations;
  let location;
  try {
    locations = await executeShopifyQueries({
      accessToken,
      query: GET_STORE_LOCATION,
      storeUrl,
      callback: (result) => result.data.locations.edges,
    });
    logger("info", "Successfully fetched the store locations");
  } catch (e) {
    logger("error", "[update-product] Could not fetch the store locations");
  }
  const defaultLocation = locations.find(
    (l) => l.node.name === "Shop location",
  );
  if (!defaultLocation) {
    location = locations[0].node.id;
  } else {
    location = defaultLocation.node.id;
  }
  let inventoryIds;
  try {
    inventoryIds = await executeShopifyQueries({
      accessToken,
      storeUrl,
      variables: {
        variantIds: variantIds,
      },
      query: GET_PRODUCT_VARIANTS_INVENTORY,
      callback: (result) => {
        return result?.data?.nodes.map((obj) => {
          return {
            delta: inventoryDelta,
            inventoryItemId: obj.inventoryItem.id,
            locationId: location,
          };
        });
      },
    });
  } catch (e) {
    logger("error", "[update-product] Could not fetch the product variant", e);
  }

  try {
    await executeShopifyQueries({
      accessToken,
      storeUrl,
      variables: {
        input: {
          reason: "correction",
          name: "available",
          changes: inventoryIds,
        },
      },
      query: INVENTORY_ADJUST_QUANTITIES,
      callback: null,
    });
  } catch (e) {
    logger(
      "error",
      "[update-product] Could not update the inventory of the variant ",
      e,
    );
  }
};
