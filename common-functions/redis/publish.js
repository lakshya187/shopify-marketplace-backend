import Queue from "bee-queue";
import logger from "#common-functions/logger/index.js";

logger(
  "info",
  `Redis connection: ${process.env.REDIS_HOST}: ${process.env.REDIS_PORT}`,
);

export default (
  service,
  obj,
  cb = (...args) => logger("info", args),
  replyCallback = undefined,
) => {
  const queue = new Queue(service, {
    removeOnSuccess: true,
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      auth_pass: process.env.REDIS_PASSWORD,
    },
  });
  const job = queue.createJob(obj);
  job
    .save()
    .then((res) => {
      logger("info", `Job Saved - Status: ${res.status}`);
      return cb(null, res.status);
    })
    .catch((err) => {
      logger("error", err);
      return cb(err);
    });

  // Success case event
  job.on("succeeded", (result) => {
    logger("info", "Received result! Job: ", job.id, service, result);

    if (replyCallback) return replyCallback(null, result);
    return null;
  });

  // Failed case event
  job.on("failed", (error) => {
    logger("info", "Job failed! Job: ", job.id, service, error);

    if (replyCallback) return replyCallback(error);
    return null;
  });
};
