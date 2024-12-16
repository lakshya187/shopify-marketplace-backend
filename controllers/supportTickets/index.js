import Stores from "#schemas/stores.js";
import SupportTickets from "#schemas/supportTickets.js";
export const CreateSupportTicket = async (req) => {
  try {
    const { subject, query, priority, contactNumber, contactName } = req.body;
    const { user } = req;

    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    }).lean();

    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }

    const ticketObj = {
      store: store._id,
      subject,
      query,
      priority,
      status: "open",
      contactNumber,
      contactName,
    };

    const ticket = new SupportTickets(ticketObj);
    const savedTicket = await ticket.save();
    return {
      status: 201,
      message: "Support ticket created successfully",
      data: savedTicket,
    };
  } catch (error) {
    return {
      status: 500,
      message: error,
    };
  }
};

export const GetSupportTickets = async (req) => {
  try {
    const { user } = req;
    const { page = 1, status } = req.query;
    const limit = 10;
    const skip = (Number(page) - 1) * limit;

    const [store] = await Stores.find({
      storeUrl: user.storeUrl,
    }).lean();

    if (!store) {
      return {
        status: 400,
        message: "Store not found",
      };
    }

    const filter = { store: store._id };
    if (status) {
      filter.status = status;
    }

    const tickets = await SupportTickets.find(filter)
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      status: 200,
      message: "Support tickets fetched successfully",
      data: tickets,
    };
  } catch (error) {
    return {
      status: 500,
      message:
        error.message || "An error occurred while fetching support tickets",
    };
  }
};
