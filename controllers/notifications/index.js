import Notifications from "#schemas/notifications.js";
import Stores from "#schemas/stores.js";

export const GetNotifications = async (req) => {
  try {
    const { user } = req;
    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    });
    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }

    const { skip, limit } = req.query;

    const notifications = await Notifications.find({
      store: store._id,
    })
      .skip(Number(skip) || 0)
      .limit(Number(limit) || 10)
      .sort({ createdAt: -1 });

    return {
      data: notifications,
      message: "Successfully fetched the notifications.",
      status: 200,
    };
  } catch (e) {
    return {
      message: e.message || e,
      status: 500,
    };
  }
};

export const UpdateNotification = async (req) => {
  try {
    const { user } = req;
    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    });
    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }

    const { id } = req.params;
    const notification = await Notifications.findById(id);
    if (notification.store !== store._id) {
      return {
        message: "This notification belongs to another store",
        status: 400,
      };
    }

    if (!notification) {
      return {
        status: 404,
        message: "Notification not found",
      };
    }

    // Find the notification by ID and update the 'read' status
    const updatedNotification = await Notifications.findOneAndUpdate(
      { _id: id, store: store._id },
      { read: true },
      { new: true },
    );

    return {
      data: updatedNotification,
      status: 200,
      message: "Notification updated successfully",
    };
  } catch (e) {
    return {
      message: e.message || e,
      status: 500,
    };
  }
};
