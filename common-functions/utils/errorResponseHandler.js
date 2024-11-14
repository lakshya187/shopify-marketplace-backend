import logger from "#common-functions/logger/index.js";

const ErrorResponseHandler = (req, res, error) => {
  console.log(error);
  logger("error", error.message);
  return res.status(error.status || 500).json({
    status: error.status || 500,
    message: error.message || "Something went wrong!",
    result: error,
    requestId: req.headers.requestid,
  });
};

export default ErrorResponseHandler;
