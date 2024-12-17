import logger from "#common-functions/logger/index.js";
import AWS from "aws-sdk";

export const GeneratePresignedUrl = async (req) => {
  const { fileName, fileType } = req.body;
  const s3 = new AWS.S3({
    region: process.env.AWS_REGION,
  });
  const params = {
    Bucket: process.env.FILE_UPLOAD_BUCKET,
    Key: fileName,
    Expires: 60,
    ContentType: fileType,
  };
  const downloadUrl = `https://${process.env.FILE_UPLOAD_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  try {
    const presignedUrl = await s3.getSignedUrlPromise("putObject", params);
    return {
      data: { presignedUrl, downloadUrl },
      message: "Successfully generated the Presigned url",
      status: 200,
    };
  } catch (error) {
    logger("error", "[generate-presigned-url]", error);
    return { message: error };
  }
};
