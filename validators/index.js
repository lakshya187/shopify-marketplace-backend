export default (schema) => {
  if (!schema) {
    throw new Error("No schema provided");
  }

  return (req, res, next) => {
    Object.keys(req.query).forEach((key) => {
      const value = req.query[key].toLowerCase();
      if (value === "true" || value === "false") {
        req.query[key] = value === "true";
      }
    });

    const { error } = schema.validate({
      ...req.body,
      ...req.query,
      ...req.params,
    });
    if (error) {
      return res.status(400).json({
        status: 400,
        message: error.details[0].message,
      });
    }
    next();
  };
};
