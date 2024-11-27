import { Router } from "express";
import AuthRoutes from "./authentication/index.js";
import ProductRoutes from "./products/index.js";
import BundleRoutes from "./bundles/index.js";
import OrderRoutes from "./orders/index.js";
import UserRoutes from "./users/index.js";

const RouteHandler = Router();

export default () => {
  RouteHandler.use("/authentication", AuthRoutes());
  RouteHandler.use("/products", ProductRoutes());
  RouteHandler.use("/bundles", BundleRoutes());
  RouteHandler.use("/orders", OrderRoutes());
  RouteHandler.use("/users", UserRoutes());
  return RouteHandler;
};
