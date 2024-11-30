import GetSingleProduct from "#common-functions/shopify/getSingleProduct.js";
import Bundles from "#schemas/bundles.js";
import Stores from "#schemas/stores.js";
import Products from "#schemas/products.js";
import GenerateImageUploadUrls from "#common-functions/shopify/generateUploadUrl.js";
import DeleteProduct from "#common-functions/shopify/deleteProduct.js";
import UpdateProduct from "#common-functions/shopify/updateProduct.js";

export const CreateBundle = async (req) => {
  try {
    const {
      name,
      description,
      productIds,
      price,
      tags,
      discount,
      metadata,
      costOfGoods,
      isOnSale,
      width,
      length,
      weight,
      images,
      coverImage,
      status,
      inventory,
      trackInventory,
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
    // fetch all the products before saving the bundle
    const products = await Promise.all(
      productIds
        .map(async (id) => {
          const product = await GetSingleProduct({
            accessToken: store.accessToken,
            productId: id,
            shopName: store.shopName,
          });
          if (product) {
            return product;
          }
          return null;
        })
        .filter(Boolean),
    );

    if (productIds.length !== products.length) {
      return {
        message: "Not all the product ids provided are valid",
        status: 400,
      };
    }
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
      width,
      length,
      weight,
      images,
      coverImage,
      profit: Number(price) - Number(costOfGoods),
      status,
      inventory,
      trackInventory,
    });

    const savedBundle = await bundle.save();

    await Promise.all(
      products.map(async (product) => {
        product.productId = product.id;
        product.bundle = bundle._id;
        await Products.create(product);
      }),
    );
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
    const { skip, limit } = req.query;

    const bundles = await Bundles.find({
      store: store._id,
    })
      .skip(Number(skip) || 0)
      .limit(Number(limit) || 10)
      .sort({ createdAt: -1 });

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
    const bundle = await Bundles.findById(bundleId);

    if (!bundle) {
      return {
        message: "Could not find the Bundle",
        status: 400,
      };
    }
    const bundleObj = bundle.toObject();

    const products = await Products.find({
      bundle: bundle._id,
    }).lean();

    bundleObj.productIds = products.map((product) => product.productId);
    return {
      data: bundleObj,
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

    const bundle = await Bundles.findById(bundleId).lean();
    if (!bundle) {
      return {
        message: "No bundle found the provided id",
        status: 400,
      };
    }

    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    }).lean();

    if (!bundle.store.equals(store._id)) {
      console.log(bundle.store, store._id);
      return {
        status: 401,
        message: "You are not authorized to delete this bundled",
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
      productIds,
      price,
      tags,
      discount,
      metadata,
      costOfGoods,
      isOnSale,
      width,
      length,
      weight,
      images,
      coverImage,
      status,
      inventory,
      trackInventory,
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
    // validate the bundle
    const doesBundleExists = await Bundles.findById(id)
      .populate("store")
      .lean();

    if (!doesBundleExists) {
      return {
        message: "Bundle id is not valid",
        status: 400,
      };
    }

    // fetch all the products before saving the bundle
    const products = await Promise.all(
      productIds
        .map(async (id) => {
          const product = await GetSingleProduct({
            accessToken: store.accessToken,
            productId: id,
            shopName: store.shopName,
          });
          if (product) {
            return product;
          }
          return null;
        })
        .filter(Boolean),
    );

    if (productIds.length !== products.length) {
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
      width,
      length,
      weight,
      images,
      coverImage,
      status,
      inventory,
      trackInventory,
      name,
      description,
    };

    // update the bundle on merchant, marketplace, db

    const updatedBundle = await Bundles.findByIdAndUpdate(id, bundleUpdateObj, {
      new: true,
    }).lean();

    const inventoryDelta = updatedBundle.inventory - doesBundleExists.inventory;
    const marketPlace = UpdateProduct({
      accessToken: internalStore.accessToken,
      shopName: internalStore.shopName,
      bundle: updatedBundle,
      products: products,
      productId: doesBundleExists.shopifyProductId,
      inventoryDelta,
    });

    const vendor = UpdateProduct({
      accessToken: store.accessToken,
      shopName: store.shopName,
      bundle: updatedBundle,
      productId: doesBundleExists.metadata.vendorShopifyId,
      products: products,
      inventoryDelta,
    });
    await Promise.all([marketPlace, vendor]);
    return {
      status: 200,
      message: "Bundle updated successfully",
    };

    // const
  } catch (e) {
    return {
      message: e,
      status: 500,
    };
  }
};
