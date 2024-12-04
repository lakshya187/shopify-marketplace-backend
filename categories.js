import mongoose from "mongoose";
import Categories from "./schemas/categories.js";

const cats = [
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/ap",
    title: "Animals & Pet Supplies",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fap",
    category: {
      id: "gid://shopify/TaxonomyCategory/ap",
      name: "Animals & Pet Supplies",
      fully_qualified_type: "Animals & Pet Supplies",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/aa",
    title: "Apparel & Accessories",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Faa",
    category: {
      id: "gid://shopify/TaxonomyCategory/aa",
      name: "Apparel & Accessories",
      fully_qualified_type: "Apparel & Accessories",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/ae",
    title: "Arts & Entertainment",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fae",
    category: {
      id: "gid://shopify/TaxonomyCategory/ae",
      name: "Arts & Entertainment",
      fully_qualified_type: "Arts & Entertainment",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/bt",
    title: "Baby & Toddler",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fbt",
    category: {
      id: "gid://shopify/TaxonomyCategory/bt",
      name: "Baby & Toddler",
      fully_qualified_type: "Baby & Toddler",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/bi",
    title: "Business & Industrial",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fbi",
    category: {
      id: "gid://shopify/TaxonomyCategory/bi",
      name: "Business & Industrial",
      fully_qualified_type: "Business & Industrial",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/co",
    title: "Cameras & Optics",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fco",
    category: {
      id: "gid://shopify/TaxonomyCategory/co",
      name: "Cameras & Optics",
      fully_qualified_type: "Cameras & Optics",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/el",
    title: "Electronics",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fel",
    category: {
      id: "gid://shopify/TaxonomyCategory/el",
      name: "Electronics",
      fully_qualified_type: "Electronics",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/fb",
    title: "Food, Beverages & Tobacco",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Ffb",
    category: {
      id: "gid://shopify/TaxonomyCategory/fb",
      name: "Food, Beverages & Tobacco",
      fully_qualified_type: "Food, Beverages & Tobacco",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/fr",
    title: "Furniture",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Ffr",
    category: {
      id: "gid://shopify/TaxonomyCategory/fr",
      name: "Furniture",
      fully_qualified_type: "Furniture",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/gc",
    title: "Gift Cards",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fgc",
    category: {
      id: "gid://shopify/TaxonomyCategory/gc",
      name: "Gift Cards",
      fully_qualified_type: "Gift Cards",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/ha",
    title: "Hardware",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fha",
    category: {
      id: "gid://shopify/TaxonomyCategory/ha",
      name: "Hardware",
      fully_qualified_type: "Hardware",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/hb",
    title: "Health & Beauty",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fhb",
    category: {
      id: "gid://shopify/TaxonomyCategory/hb",
      name: "Health & Beauty",
      fully_qualified_type: "Health & Beauty",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/hg",
    title: "Home & Garden",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fhg",
    category: {
      id: "gid://shopify/TaxonomyCategory/hg",
      name: "Home & Garden",
      fully_qualified_type: "Home & Garden",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/lb",
    title: "Luggage & Bags",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Flb",
    category: {
      id: "gid://shopify/TaxonomyCategory/lb",
      name: "Luggage & Bags",
      fully_qualified_type: "Luggage & Bags",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/ma",
    title: "Mature",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fma",
    category: {
      id: "gid://shopify/TaxonomyCategory/ma",
      name: "Mature",
      fully_qualified_type: "Mature",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/me",
    title: "Media",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fme",
    category: {
      id: "gid://shopify/TaxonomyCategory/me",
      name: "Media",
      fully_qualified_type: "Media",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/os",
    title: "Office Supplies",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fos",
    category: {
      id: "gid://shopify/TaxonomyCategory/os",
      name: "Office Supplies",
      fully_qualified_type: "Office Supplies",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/pa",
    title: "Product Add-Ons",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fpa",
    category: {
      id: "gid://shopify/TaxonomyCategory/pa",
      name: "Product Add-Ons",
      fully_qualified_type: "Product Add-Ons",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/rc",
    title: "Religious & Ceremonial",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Frc",
    category: {
      id: "gid://shopify/TaxonomyCategory/rc",
      name: "Religious & Ceremonial",
      fully_qualified_type: "Religious & Ceremonial",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/se",
    title: "Services",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fse",
    category: {
      id: "gid://shopify/TaxonomyCategory/se",
      name: "Services",
      fully_qualified_type: "Services",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/so",
    title: "Software",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fso",
    category: {
      id: "gid://shopify/TaxonomyCategory/so",
      name: "Software",
      fully_qualified_type: "Software",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/sg",
    title: "Sporting Goods",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fsg",
    category: {
      id: "gid://shopify/TaxonomyCategory/sg",
      name: "Sporting Goods",
      fully_qualified_type: "Sporting Goods",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/tg",
    title: "Toys & Games",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Ftg",
    category: {
      id: "gid://shopify/TaxonomyCategory/tg",
      name: "Toys & Games",
      fully_qualified_type: "Toys & Games",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/na",
    title: "Uncategorized",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fna",
    category: {
      id: "gid://shopify/TaxonomyCategory/na",
      name: "Uncategorized",
      fully_qualified_type: "Uncategorized",
      depth: 0,
    },
  },
  {
    searchIdentifier: "gid://shopify/TaxonomyCategory/vp",
    title: "Vehicles & Parts",
    url: "?categoryId=gid%3A%2F%2Fshopify%2FTaxonomyCategory%2Fvp",
    category: {
      id: "gid://shopify/TaxonomyCategory/vp",
      name: "Vehicles & Parts",
      fully_qualified_type: "Vehicles & Parts",
      depth: 0,
    },
  },
];

const insertCategories = async () => {
  const mongoURI =
    "mongodb+srv://admin:97q5iKa6An2bKG5z@giftkart-dev.celp0.mongodb.net/giftkart";
  await mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("Connected to the database.");

  // Clear the notifications collection before adding new data
  const sanitizedCategories = cats.map((c) => {
    c.category.fullyQualifiedType = c.category.fully_qualified_type;
    delete c.category.fully_qualified_type;
    return c;
  });
  console.log(sanitizedCategories);

  await Categories.insertMany(sanitizedCategories);
};
insertCategories().then((e) => {
  console.log("successfully inserted the categories");
});
