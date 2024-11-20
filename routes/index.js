import { Router } from "express";
import AuthRoutes from "./authentication/index.js";
import ProductRoutes from "./products/index.js";
import BundleRoutes from "./bundles/index.js";
const RouteHandler = Router();

export default () => {
  RouteHandler.use("/authentication", AuthRoutes());
  RouteHandler.use("/products", ProductRoutes());
  RouteHandler.use("/bundles", BundleRoutes());
  return RouteHandler;
};
