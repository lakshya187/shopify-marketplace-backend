import mongoose from "mongoose";
import Notifications from "./schemas/notifications.js"; // Adjust the path as needed

// Replace with your actual MongoDB URI
const mongoURI =
  "mongodb+srv://admin:97q5iKa6An2bKG5z@giftkart-dev.celp0.mongodb.net/giftkart";

const sampleNotifications = [
  {
    title: "New Order Received",
    description:
      "You have received a new order. Check your dashboard for details.",
    category: "orders",
    store: "674d758bfd03beb644a030e8", // Replace with the actual store ID
    read: false,
  },
  {
    title: "Payment Processed",
    description: "Your recent payment has been processed successfully.",
    category: "payments",
    store: "674d758bfd03beb644a030e8", // Replace with the actual store ID
    read: false,
  },
  {
    title: "Inventory Low Alert",
    description: "Your stock for Product X is running low. Restock soon!",
    category: "inventory",
    store: "674d758bfd03beb644a030e8", // Replace with the actual store ID
    read: false,
  },
  {
    title: "Customer Review Received",
    description: "You have received a new review from a customer.",
    category: "customer",
    store: "674d758bfd03beb644a030e8", // Replace with the actual store ID
    read: false,
  },
  {
    title: "Platform Maintenance Scheduled",
    description:
      "Scheduled maintenance will occur on 2024-12-10 at 2:00 AM. Be prepared for a short downtime.",
    category: "platform_updates",
    store: "674d758bfd03beb644a030e8", // Replace with the actual store ID
    read: false,
  },
];

const populateNotifications = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Connected to the database.");

    // Clear the notifications collection before adding new data
    await Notifications.deleteMany({ store: "674d758bfd03beb644a030e8" }); // Replace with the actual store ID

    // Insert the sample notifications
    const result = await Notifications.insertMany(sampleNotifications);

    console.log("Notifications inserted successfully:", result);
  } catch (error) {
    console.error("Error inserting notifications:", error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log("Disconnected from the database.");
  }
};

// Run the script
populateNotifications();
