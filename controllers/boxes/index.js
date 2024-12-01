import Boxes from "#schemas/boxes.js";
// no validation done for store since it is a master collection
export const GetAllBoxes = async () => {
  try {
    const data = await Boxes.find().lean();
    return {
      data,
      message: "Successfully fetched the boxes.",
      status: 200,
    };
  } catch (e) {
    return {
      message: e,
      status: 500,
    };
  }
};
