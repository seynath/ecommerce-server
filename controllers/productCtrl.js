const asyncHandler = require("express-async-handler");
const slugify = require("slugify");
const {
  cloudinaryUploadImg,
  cloudinaryDeleteImg,
} = require("../utils/cloudinary");
const fs = require("fs");
const { pool } = require("../config/db"); // adjust the path according to your project structure

const createProduct = asyncHandler(async (req, res) => {
  try {
    const { title, description, brand, category, attributes } = req.body;

    console.log(title, description, brand, category);

    console.log(attributes);

    console.log("before attributes");

    const parsedAttributes = JSON.parse(attributes);

    // let lowestPrice = Number.MAX_SAFE_INTEGER;
    // if (parsedAttributes && parsedAttributes.length > 0) {
    //   lowestPrice = Math.min(...parsedAttributes.map(attr => attr.price));
    // }

    let lowestPrice = Infinity;
    if (parsedAttributes && parsedAttributes.length > 0) {
      lowestPrice = Math.min(
        ...parsedAttributes.map((attr) => parseFloat(attr.price))
      );
    }

    const slug = title ? slugify(title) : "";

    // Insert product into the database
    const connection = await pool.getConnection();

    const sql = `INSERT INTO product (p_title, p_slug, p_description, brand, category_id, price) VALUES (?, ?, ?, ?, ?, ?)`;
    const [result] = await connection.execute(sql, [
      title,
      slug,
      description,
      brand,
      category,
      lowestPrice,
    ]);
    const productId = result.insertId;
    console.log(productId);

    if (parsedAttributes && parsedAttributes.length > 0) {
      parsedAttributes.forEach(async (attribute, index) => {
        console.log(`Attribute ${index + 1}:`);
        console.log(`Size: ${attribute.size}`);
        console.log(`Color: ${attribute.color}`);
        console.log(`Quantity: ${attribute.quantity}`);
        console.log(`Price: ${attribute.price}`);

        barcodeValue = `${productId}${index}${attribute.size}`;

        console.log(barcodeValue);
        

        const attributesSql = `INSERT INTO size_color_quantity (product_id, size_id, color_code, quantity, unit_price, barcode) VALUES (?, ?, ?, ?, ?, ?)`;
        const [resultsAttributes] = await connection.execute(attributesSql, [
          productId,
          attribute.size,
          attribute.color,
          attribute.quantity,
          attribute.price,
          barcodeValue
        ]);

        console.log(resultsAttributes);
      });
    }

    const uploader = (path) => cloudinaryUploadImg(path, "images");
    const urls = [];
    const files = req.files;
    // console.log(files);
    for (let i = 0; i < files.length; i++) {
      const { path } = files[i];
      const newPath = await uploader(path);
      urls.push(newPath);

      const imageSql =
        "INSERT INTO image ( image_link, product_id,  asset_id, public_id) VALUES (?, ?, ?, ?)";
      const [addedImage] = await connection.execute(imageSql, [
        newPath.url,
        productId,
        newPath.asset_id,
        newPath.public_id,
      ]);
    }

    connection.release();

    res.json({ message: "Product created successfully", productId, urls });
  } catch (err) {
    res.status(500).json({ message: "Failed to create product" });
  }
});

const updateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { title, description, brand, category, attributes } = req.body;
  console.log(req.body);

  console.log(productId);

  // Parse the attributes string into an array of objects
  const parsedAttributes = JSON.parse(attributes);

  // Get the lowest price from the attributes
  let lowestPrice = Infinity;
  if (parsedAttributes && parsedAttributes.length > 0) {
    lowestPrice = Math.min(
      ...parsedAttributes.map((attr) => parseFloat(attr.price))
    );
  }
  const slug = title ? slugify(title) : "";

  // Update the product record in the database
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const sql = `
    UPDATE product
    SET p_title = ?,
    p_slug = ?,
    p_description = ?,
    brand = ?,
    category_id = ?,
    price = ?
    WHERE p_id = ?
    `;
    const [result] = await connection.execute(sql, [
      title,
      slug,
      description,
      brand,
      category,
      lowestPrice,
      productId,
    ]);
    console.log("aawa");

    console.log(result);
    // Update the size_color_quantity records for the product
    if (parsedAttributes && parsedAttributes.length > 0) {
      const deleteSql = `DELETE FROM size_color_quantity WHERE product_id = ?`;
      await connection.execute(deleteSql, [productId]);

      const insertPromises = parsedAttributes.map(async (attribute, index) => {
        const { size, color, quantity, price } = attribute;

        const barcodeValue = `${productId}${index}${size}`;

        const insertSql = `
          INSERT INTO size_color_quantity
          (product_id, size_id, color_code, quantity, unit_price, barcode)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        await connection.execute(insertSql, [
          productId,
          size,
          color,
          quantity,
          price,
          barcodeValue,
        ]);
      });

      await Promise.all(insertPromises);
    }

    // Update the image records for the product
    const deleteImageSql = `DELETE FROM image WHERE product_id = ?`;
    await connection.execute(deleteImageSql, [productId]);

    const uploader = (path) => cloudinaryUploadImg(path, "images");
    const urls = [];
    const files = req.files;
    for (let i = 0; i < files.length; i++) {
      const { path } = files[i];
      const newPath = await uploader(path);
      urls.push(newPath);

      const imageSql =
        "INSERT INTO image ( image_link, product_id,  asset_id, public_id) VALUES (?, ?, ?, ?)";
      await connection.execute(imageSql, [
        newPath.url,
        productId,
        newPath.asset_id,
        newPath.public_id,
      ]);
    }

    await connection.commit();

    res.status(201).json({ message: "Product updated successfully", productId, urls });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  // Delete the product record from the database
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const deleteSql = `DELETE FROM product WHERE p_id = ?`;
    const [result] = await connection.execute(deleteSql, [productId]);

    if (result.affectedRows === 0) {
      // Product not found, return 404 Not Found
      res.status(404).json({ message: "Product not found" });
      return;
    }

    // Delete the associated size_color_quantity records
    const deleteSizeColorQuantitySql = `DELETE FROM size_color_quantity WHERE product_id = ?`;
    await connection.execute(deleteSizeColorQuantitySql, [productId]);

    // Delete the associated image records
    const deleteImageSql = `DELETE FROM image WHERE product_id = ?`;
    await connection.execute(deleteImageSql, [productId]);

    await connection.commit();

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
})

const getProductCashier = asyncHandler(async (req,res) =>{
const {barcode} = req.params

try {
  const connection = await pool.getConnection();
  const [rows] = await connection.execute(
    `
    SELECT 
    p.p_id,
    p.p_title,
    p.brand,
    scq.*,
    i.image_link,
    s.size_name
    FROM product p 
    LEFT JOIN 
    size_color_quantity scq ON p.p_id = scq.product_id
    LEFT JOIN
    image i ON p.p_id = i.product_id
    LEFT JOIN
    size s ON scq.size_id = s.size_id

    WHERE scq.barcode = ?
    `,
    [barcode]
  );
  console.log(rows);
  connection.release();
  res.json(rows);
  
} catch (error) {
  res.status(500).json({ message: error.message });

  
}
})

const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    // Connect to MySQL database
    const connection = await pool.getConnection();

    // Execute the SQL SELECT query
    const [rows] = await connection.execute(
      `
    SELECT 
    p.p_id,
    p.p_title,
    p.p_slug,
    p.p_description,
    p.brand,
    p.sold,
    p.price,
    p.total_rating,
    p.category_id,
    scq.*,
    i.image_link,
    s.size_name
    FROM product p 
    LEFT JOIN 
    size_color_quantity scq ON p.p_id = scq.product_id
    LEFT JOIN
    image i ON p.p_id = i.product_id
    LEFT JOIN
    size s ON scq.size_id = s.size_id

    WHERE p.p_id = ?
    `,
      [id]
    );

    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({ message: "Product not found" });
    }
    console.log(rows);

    const product = {
      ...rows[0],
      images: [],
      size_color_quantity: [],
    };

    rows.forEach((row) => {
      // Add images to the product
      if (!product.images.find((img) => img.image_link === row.image_link)) {
        product.images.push({ image_link: row.image_link });
      }

      // Add size_color_quantity to the product
      const scqIndex = product.size_color_quantity.findIndex(
        (scq) => scq.size_color_quantity_id === row.size_color_quantity_id
      );

      if (scqIndex === -1) {
        product.size_color_quantity.push({
          size_color_quantity_id: row.size_color_quantity_id,
          product_id: row.product_id,
          size_id: row.size_id,
          size_name: row.size_name,
          color_code: row.color_code,
          quantity: row.quantity,
          unit_price: row.unit_price,
        });
      }
    });

    // console.log(product);

    connection.release();
    console.log(product);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



const getAllProducts = async (req, res) => {
  try {
    // Get a MySQL connection from the pool
    const connection = await pool.getConnection();

    sql = `SELECT  
    p.*,
    i.image_id,
    i.image_link,
    cat.cat_name

    FROM product p

    LEFT JOIN image i ON p.p_id = i.product_id
    LEFT JOIN category cat ON p.category_id = cat.cat_id
     `;

    // Execute a SELECT query to fetch all users
    // const [rows] = await connection.execute(
    //   "SELECT * FROM product LEFT JOIN image ON product.p_id = image.product_id");
    const [rows] = await connection.execute(sql);
    // console.log(rows);

    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({ message: "No Products Found" });
    }

    // Process the data to group images by product
    const products = rows.reduce((acc, row) => {
      const existingProductIndex = acc.findIndex((p) => p.p_id === row.p_id);

      if (existingProductIndex !== -1) {
        // If the product already exists in the accumulator, add the image to its images array
        acc[existingProductIndex].images.push({
          image_id: row.image_id,
          image_link: row.image_link,
          // Add other image properties here if needed
        });
      } else {
        // If the product doesn't exist in the accumulator, create a new product object with an images array
        acc.push({
          ...row,
          images: [
            {
              image_id: row.image_id,
              image_link: row.image_link,
              // Add other image properties here if needed
            },
          ],
        });
      }

      return acc;
    }, []);
    // console.log(products)

    connection.release();

    // Send the processed data in the response
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const addToWishlist = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const { prodId } = req.body;

  // const  _id = 13;
  try {
    // Connect to MySQL database
    const connection = await pool.getConnection();

    // Check if the user has already added the product to their wishlist
    const [existingWishlist] = await connection.execute(
      "SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?",
      [id, prodId]
    );

    if (existingWishlist.length > 0) {
      // If the product is already in the wishlist, remove it
      await connection.execute(
        "DELETE FROM wishlist WHERE user_id = ? AND product_id = ?",
        [id, prodId]
      );
      res.json({ message: "Product removed from wishlist" });
    } else {
      // If the product is not in the wishlist, add it
      await connection.execute(
        "INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)",
        [id, prodId]
      );
      res.status(204).json({ message: "Product added to wishlist" });
    }
  } catch (error) {
    throw new Error(error);
  }
});


const rating = async (req, res) => {
  // const { _id } = req.user;
  const { star, prodId, comment } = req.body;
  const _id = 12;
  try {
    // Connect to MySQL database
    const connection = await pool.getConnection();

    // Check if the user has already rated the product
    const checkRatingQuery = `
          SELECT *
          FROM ratings
          WHERE user_id = ? AND product_id = ?
      `;
    const [ratingRows] = await connection.execute(checkRatingQuery, [
      _id,
      prodId,
    ]);
    const alreadyRated = ratingRows.length > 0;

    if (alreadyRated) {
      // Update existing rating
      const updateRatingQuery = `
              UPDATE ratings
              SET star = ?, comment = ?
              WHERE user_id = ? AND product_id = ?
          `;
      await connection.execute(updateRatingQuery, [star, comment, _id, prodId]);
    } else {
      // Add new rating
      const addRatingQuery = `
              INSERT INTO ratings (user_id, product_id, star, comment)
              VALUES (?, ?, ?, ?)
          `;
      await connection.execute(addRatingQuery, [_id, prodId, star, comment]);
    }

    // Calculate total rating and update product
    const calculateRatingQuery = `
          SELECT AVG(star) AS total_rating
          FROM ratings
          WHERE product_id = ?
      `;
    const [averageRatingRows] = await connection.execute(calculateRatingQuery, [
      prodId,
    ]);
    console.log("Average Rating Rows:", averageRatingRows);
    const totalRating = averageRatingRows[0].total_rating;
    console.log("Total Rating:", totalRating);

    const updateTotalRatingQuery = `
          UPDATE product
          SET total_rating = ?
          WHERE p_id = ?
      `;
    const [updateResult] = await connection.execute(updateTotalRatingQuery, [
      totalRating,
      prodId,
    ]);
    // console.log("Update Result:", updateResult);

    // Fetch and return updated product
    const getProductQuery = `
          SELECT *
          FROM product
          WHERE p_id = ?
      `;
    const [productRows] = await connection.execute(getProductQuery, [prodId]);
    const updatedProduct = productRows[0];

    res.json(updatedProduct);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to rate product" });
  }
};

// const rating = asyncHandler(async (req, res) => {
//   const { _id } = req.user;
//   const { star, prodId, comment } = req.body;
//   try {
//     const product = await Product.findById(prodId);
//     let alreadyRated = product.ratings.find(
//       (userId) => userId.postedby.toString() === _id.toString()
//     );

//     if (alreadyRated) {
//       const updateRating = await Product.updateOne(
//         {
//           ratings: { $elemMatch: alreadyRated },
//         },
//         {
//           $set: { "ratings.$.star": star, "ratings.$.comment": comment },
//         },
//         {
//           new: true,
//         }
//       );
//     } else {
//       const rateProduct = await Product.findByIdAndUpdate(
//         prodId,
//         {
//           $push: {
//             ratings: {
//               star: star,
//               comment: comment,
//               postedby: _id,
//             },
//           },
//         },
//         {
//           new: true,
//         }
//       );
//     }
//     const getallratings = await Product.findById(prodId);
//     let totalRating = getallratings.ratings.length;
//     let ratingsum = getallratings.ratings
//       .map((item) => item.star)
//       .reduce((prev, curr) => prev + curr, 0);
//     let actualRating = Math.round(ratingsum / totalRating);
//     let finalproduct = await Product.findByIdAndUpdate(
//       prodId,
//       {
//         totalrating: actualRating,
//       },
//       { new: true }
//     );
//     res.json(finalproduct);
//   } catch (error) {
//     throw new Error(error);
//   }
// });

// const uploadImages = asyncHandler(async (req, res) => {

//   const { id } = req.params;
//   validateMongoDBId(id);

//   try{
//     const uploader = (path) => cloudinaryUploadImg(path, 'images');
//     const urls = [];
//     const files = req.files;
//     for (const file of files) {
//       const { path } = file;
//       const newPath = await uploader(path);
//       urls.push(newPath);
//       fs.unlinkSync(path);
//     }
//     const findProduct = await Product.findByIdAndUpdate(id,
//     {
//       images: urls.map(file=>{return file;}),
//     },
//     {new:true});
//     res.json(findProduct);
//   }
//   catch(error){
//     console.log(error);
//     throw new Error(error);
//   }

// });

const uploadImages = asyncHandler(async (req, res) => {
  try {
    const uploader = (path) => cloudinaryUploadImg(path, "images");
    const urls = [];
    const files = req.files;
    for (const file of files) {
      const { path } = file;
      const newPath = await uploader(path);
      urls.push(newPath);
      fs.unlinkSync(path);
    }

    const images = urls.map((file) => {
      return file;
    });

    res.json(images);
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
});

const deleteImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = cloudinaryDeleteImg(id, "images");
    res.json({ message: "Deleted Successfully" });
  } catch (error) {
    throw new Error(error);
  }
});

module.exports = {
  createProduct,
  getProduct,
  getProductCashier,
  getAllProducts,
  updateProduct,
  deleteProduct,
  addToWishlist,
  rating,
  uploadImages,
  deleteImages,
};
