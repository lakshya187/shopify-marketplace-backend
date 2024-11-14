const SuccessResponseHandler = (req, res, data) =>
  res.status(data.status || 500).json({
    status: data.status || 500,
    message: data.message || "Something went wrong!",
    result: data.data,
    requestId: req.headers.requestid,
  });

export default SuccessResponseHandler;
