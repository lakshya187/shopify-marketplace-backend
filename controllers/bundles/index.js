import Bundles from "#schemas/bundles.js";
import Stores from "#schemas/stores.js";
import Products from "#schemas/products.js";
import GenerateImageUploadUrls from "#common-functions/shopify/generateUploadUrl.js";
import DeleteProduct from "#common-functions/shopify/deleteProduct.js";
import UpdateProduct from "#common-functions/shopify/updateProduct.js";
import Categories from "#schemas/categories.js";

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
    const staticImageUrl = `https://giftclub-assets.s3.ap-south-1.amazonaws.com/pack+this+gift+square-27.jpg`;
    // images.push(staticImageUrl);
    const netPrice = Number(price) - Number(discount || 0);
    const bundle = new Bundles({
      name,
      description,
      store: store._id,
      price: netPrice,
      tags: tags || [],
      discount: discount || 0,
      metadata: metadata || {},
      costOfGoods,
      isOnSale,
      images: [...images, staticImageUrl],
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
    await Promise.all([
      Bundles.findByIdAndDelete(bundleId),
      DeleteProduct({
        accessToken: store.accessToken,
        shopName: store.shopName,
        productId: bundle.shopifyProductId,
      }),
    ]);
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
    const urls = await GenerateImageUploadUrls({
      accessToken: store.accessToken,
      shopName: store.shopName,
      files: [{ filename, mimeType, fileSize }],
    });

    return {
      data: urls,
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
      price: Number(price) - Number(discount) ?? 0,
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

    const inventoryDelta = updatedBundle.inventory - doesBundleExists.inventory;
    const marketPlace = UpdateProduct({
      accessToken: internalStore.accessToken,
      shopName: internalStore.shopName,
      bundle: updatedBundle,
      products: products,
      productId: doesBundleExists.shopifyProductId,
      inventoryDelta,
    });
    let vendor;
    if (doesBundleExists.metadata?.vendorShopifyId) {
      vendor = UpdateProduct({
        accessToken: store.accessToken,
        shopName: store.shopName,
        bundle: updatedBundle,
        productId: doesBundleExists.metadata.vendorShopifyId,
        products: products,
        inventoryDelta,
      });
    }
    await Promise.all([marketPlace, vendor]);
    return {
      status: 200,
      message: "Bundle updated successfully",
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

//utility functions
const covertArrayToMap = (key, arr) => {
  const map = {};
  arr.forEach((item) => {
    map[item[key]] = item;
  });
  return map;
};
