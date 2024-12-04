import Categories from "#schemas/categories.js";

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
