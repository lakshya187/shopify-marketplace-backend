import { Router } from "express";
import AuthRoutes from "./authentication/index.js";
import ProductRoutes from "./products/index.js";
import BundleRoutes from "./bundles/index.js";
import OrderRoutes from "./orders/index.js";
import UserRoutes from "./users/index.js";
import StoreBoxOrdersRoutes from "./storeBoxOrders/index.js";
import CouponRoutes from "./coupons/index.js";
import BoxRoutes from "./boxes/index.js";
import StoreBoxRoutes from "./storeBoxes/index.js";
import SupportTicketsRoutes from "./supportTickets/index.js";
import NotificationRoutes from "./notifications/index.js";
import CategoriesRoutes from "./categories/index.js";

const RouteHandler = Router();

export default () => {
  RouteHandler.use("/authentication", AuthRoutes());
  RouteHandler.use("/products", ProductRoutes());
  RouteHandler.use("/bundles", BundleRoutes());
  RouteHandler.use("/orders", OrderRoutes());
  RouteHandler.use("/users", UserRoutes());
  RouteHandler.use("/coupons", CouponRoutes());
  RouteHandler.use("/store-box-orders", StoreBoxOrdersRoutes());
  RouteHandler.use("/boxes", BoxRoutes());
  RouteHandler.use("/store-boxes", StoreBoxRoutes());
  RouteHandler.use("/support-tickets", SupportTicketsRoutes());
  RouteHandler.use("/notifications", NotificationRoutes());
  RouteHandler.use("/categories", CategoriesRoutes());

  return RouteHandler;
};
