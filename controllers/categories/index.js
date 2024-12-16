import Categories from "#schemas/categories.js";

// not validating the store since categories is a master collection
export const GetCategories = async (req) => {
  try {
    const data = await Categories.find();
    return {
      data,
      message: "Categories fetched successfully",
      status: 200,
    };
  } catch (e) {
    return {
      message: e,
      status: 500,
    };
  }
};
