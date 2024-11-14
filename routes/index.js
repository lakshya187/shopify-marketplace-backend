import { Router } from "express";
import AuthRoutes from "./authentication/index.js";

const RouteHandler = Router();

export default () => {
  RouteHandler.use("/authentication", AuthRoutes());

  return RouteHandler;
};
