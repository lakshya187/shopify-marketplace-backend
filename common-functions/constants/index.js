export const ServiceQueuesMapper = {
  reviewApp: {
    request: "reviews-app-request-queue",
    reply: "reviews-app-reply-queue",
  },
};

export const ASSET_CATEGORY_BUCKET_MAP = {
  snip: process.env.S3_SNIPS_BUCKET,
  postAsset: process.env.S3_POST_ASSETS_BUCKET,
  extraAsset: process.env.S3_EXTRA_ASSETS_BUCKET,
};
