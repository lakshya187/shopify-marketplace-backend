import Queue from "bee-queue";
import logger from "#common-functions/logger/index.js";

logger(
  "info",
  `Connecting Redis to ${process.env.REDIS_HOST} : ${process.env.REDIS_PORT}`,
);

export default (service, cb) => {
  const queue = new Queue(service, {
    removeOnSuccess: true,
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      auth_pass: process.env.REDIS_PASSWORD,
      password: process.env.REDIS_PASSWORD,
      socket_keepalive: true,
    },
    isWorker: true,
  });
  queue.process((job, done) => {
    logger("info", `Processing Job ${job.id}`);
    return cb(null, job.data, done);
  });
};
