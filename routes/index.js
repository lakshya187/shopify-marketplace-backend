import { Router } from "express";
import AuthRoutes from "./authentication/index.js";
import ProductRouts from "./products/index.js";
const RouteHandler = Router();

export default () => {
  RouteHandler.use("/authentication", AuthRoutes());
  RouteHandler.use("/products", ProductRouts());
  return RouteHandler;
};
