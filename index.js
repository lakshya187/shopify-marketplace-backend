import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import AWSXRay from "aws-xray-sdk";
import logger from "./common-functions/logger/index.js";
import RequestTracker from "./middlewares/request-tracker.js";
import MountAPI from "./routes/index.js";
import StartSubscribers from "./subscribers/index.js";
import StartJobs from "./jobs/index.js";

const application = express();
const PORT = process.env.APPLICATION_PORT || 8080;

// Configure environment variables
dotenv.config();

// AWS XRAY Setup
if (process.env.NODE_ENV === "production") {
  application.use(
    AWSXRay.express.openSegment(process.env.AWS_XRAY_APP_SEGMENT_NAME),
  );
}

application.use(cors());
application.use(express.json());
application.use(express.urlencoded({ extended: true }));

application.use(RequestTracker);

application.get("/health", (req, res) =>
  res.status(200).json({
    status: 200,
    message: "Working!",
  }),
);

application.use("/api", MountAPI());

application.use("*", (req, res) =>
  res.status(404).json({
    status: 404,
    message: "Sorry, the requested url does not found!",
  }),
);

if (process.env.NODE_ENV === "production") {
  application.use(AWSXRay.express.closeSegment());
}

application.listen(PORT, () => {
  StartJobs();
  logger("info", `Application is running on port ${PORT}`);
});
