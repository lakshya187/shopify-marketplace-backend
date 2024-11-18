import { Router } from "express";
import AuthRoutes from "./authentication/index.js";
import ProductRouts from "./products/index.js";
import BundleRoutes from "./bundle/index.js";
const RouteHandler = Router();

export default () => {
  RouteHandler.use("/authentication", AuthRoutes());
  RouteHandler.use("/products", ProductRouts());
  RouteHandler.use("/bundles", BundleRoutes());
  return RouteHandler;
};
