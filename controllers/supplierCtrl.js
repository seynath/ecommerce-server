const asyncHandler = require("express-async-handler");
const { pool } = require("../config/db");

const createSupplier = asyncHandler(async (req, res) => {
  const {
    supplierName,
    supplierEmail,
    supplierPhone,
    supplierAddress,
    productIds,
  } = req.body;
  console.log(req.body);
  try {
    const connection = await pool.getConnection();

    // Begin transaction
    await connection.beginTransaction();

    // Check if supplier already exists
    const checkSupplierQuery = "SELECT * FROM supplier WHERE supplier_name = ?";
    const [checkSupplierResult] = await connection.execute(checkSupplierQuery, [
      supplierName,
    ]);

    if (checkSupplierResult.length > 0) {
      // Rollback transaction
      await connection.rollback();
      connection.release();
      return res.status(400).json({ message: "Supplier already exists" });
    }

    // Insert new supplier
    const insertSupplierQuery =
      "INSERT INTO supplier (supplier_name, supplier_email, supplier_phone, supplier_address) VALUES (?, ?, ?, ?)";
    const [insertSupplierResult] = await connection.execute(
      insertSupplierQuery,
      [supplierName, supplierEmail, supplierPhone, supplierAddress]
    );

    const newSupplierId = insertSupplierResult.insertId;

    // Insert into supplier_products table to associate supplier with products
    const associateProductsQuery =
      "INSERT INTO supplier_products (product_id, supplier_id) VALUES (?, ?)";
    for (let productId of productIds) {
      await connection.execute(associateProductsQuery, [
        productId,
        newSupplierId,
      ]);
    }

    // Commit transaction
    await connection.commit();
    connection.release();
    return res.status(201).json({
      message: "Supplier created and associated with products",
      supplierId: newSupplierId,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const getAllSuppliers = asyncHandler(async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Get all suppliers
    const getSuppliersQuery = "SELECT * FROM supplier";
    const [suppliersResult] = await connection.execute(getSuppliersQuery);

    connection.release();
    return res.json(suppliersResult);
  } catch (error) {
    throw new Error(error);
  }
});

const updateSupplier = asyncHandler(async (req, res) => {
  const {
    supplierId,
    supplierName,
    supplierEmail,
    supplierPhone,
    supplierAddress,
    productIds,
  } = req.body;

  try {
    const connection = await pool.getConnection();

    // Begin transaction
    await connection.beginTransaction();

    // Check if supplier already exists with the new name
    const checkSupplierQuery =
      "SELECT * FROM supplier WHERE supplier_name = ? AND supplier_id <> ?";
    const [checkSupplierResult] = await connection.execute(checkSupplierQuery, [
      supplierName,
      supplierId,
    ]);

    if (checkSupplierResult.length > 0) {
      // Rollback transaction
      await connection.rollback();
      connection.release();
      return res
        .status(400)
        .json({ message: "Supplier with this name already exists" });
    }

    // Update supplier
    const updateSupplierQuery =
      "UPDATE supplier SET supplier_name = ?, supplier_email = ?, supplier_phone = ?, supplier_address = ? WHERE supplier_id = ?";
    await connection.execute(updateSupplierQuery, [
      supplierName,
      supplierEmail,
      supplierPhone,
      supplierAddress,
      supplierId,
    ]);

    // Delete existing supplier_products associations
    const deleteAssociationsQuery =
      "DELETE FROM supplier_products WHERE supplier_id = ?";
    await connection.execute(deleteAssociationsQuery, [supplierId]);

    // Insert into supplier_products table to associate supplier with products
    const associateProductsQuery =
      "INSERT INTO supplier_products (product_id, supplier_id) VALUES (?, ?)";
    for (let productId of productIds) {
      await connection.execute(associateProductsQuery, [productId, supplierId]);
    }

    // Commit transaction
    await connection.commit();
    connection.release();
    return res.status(200).json({
      message: "Supplier updated and associated with products",
      supplierId: supplierId,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const deleteSupplier = asyncHandler(async (req, res) => {
  const { supplierId } = req.body;

  try {
    const connection = await pool.getConnection();

    // Begin transaction
    await connection.beginTransaction();

    // Delete supplier_products associations
    const deleteAssociationsQuery =
      "DELETE FROM supplier_products WHERE supplier_id = ?";
    await connection.execute(deleteAssociationsQuery, [supplierId]);

    // Delete supplier
    const deleteSupplierQuery = "DELETE FROM supplier WHERE supplier_id = ?";
    await connection.execute(deleteSupplierQuery, [supplierId]);

    // Commit transaction
    await connection.commit();
    connection.release();
    return res.status(200).json({ message: "Supplier deleted" });
  } catch (error) {
    throw new Error(error);
  }
});

const getASupplier11 = asyncHandler(async (req, res) => {
  const { supplierId } = req.params;
  
  try {
    const connection = await pool.getConnection();

    const getSupplierQuerys = `
    SELECT supplier_products.*, product.*, supplier.*, image.*
    FROM supplier_products
    LEFT JOIN product ON supplier_products.product_id = product.p_id
    LEFT JOIN supplier ON supplier_products.supplier_id = supplier.supplier_id
    LEFT JOIN image ON product.p_id = image.product_id
    WHERE supplier.supplier_id = ?`

    const [supplierResult] = await connection.execute(getSupplierQuerys, [supplierId]);
    console.log(supplierResult);
    connection.release();
    return res.status(200).json(supplierResult);
  } catch (error) {
    // res.status(400).json("wada naa")
    throw new Error(error);
  }
});
const getASupplier = asyncHandler(async (req, res) => {
  const { supplierId } = req.params;

  try {
    const connection = await pool.getConnection();

    const getSupplierQuerys = `
    SELECT
    supplier_products.supplier_products_id,
    supplier_products.product_id,
    supplier_products.supplier_id,
    product.p_id,
    product.p_title,
    product.p_slug,
    product.p_description,
    product.brand,
    product.quantity,
    product.price,
    product.sold,
    product.total_rating,
    product.category_id,
    product.created_at,
    supplier.supplier_name,
    supplier.supplier_email,
    supplier.supplier_phone,
    supplier.supplier_address,
    image.image_id,
    image.image_link,
    image.asset_id,
    image.public_id
  FROM
    supplier_products
  LEFT JOIN
    product ON supplier_products.product_id = product.p_id
  LEFT JOIN
    supplier ON supplier_products.supplier_id = supplier.supplier_id
  LEFT JOIN
    image ON product.p_id = image.product_id
  WHERE
    supplier.supplier_id = ?;
      `;

    const [supplierResult] = await connection.execute(getSupplierQuerys, [supplierId]);

    // Group the images by the product_id using the reduce function
    const groupedResult = supplierResult.reduce((acc, curr) => {
      const { supplier_products_id, ...rest } = curr;
      if (acc[supplier_products_id]) {
        acc[supplier_products_id].images.push(rest);
      } else {
        acc[supplier_products_id] = { ...rest, images: [rest] };
      }
      return acc;
    }, {});

    // Convert the object into an array
    const finalResult = Object.values(groupedResult);

    connection.release();
    return res.status(200).json(finalResult);
  } catch (error) {
    throw new Error(error);
  }
});


const deleteProductFromSupplierByID = asyncHandler(async(req,res) =>{
  console.log(req.body);
  const {productId, supplierId} = req.body;
  // const {productId} = req.params.productId;
  console.log(supplierId);
  console.log(productId);


  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    const deleteProductQuery = "DELETE FROM supplier_products WHERE supplier_id = ? AND product_id = ?";
    await connection.execute(deleteProductQuery, [supplierId, productId]);
    await connection.commit();
    connection.release();
    return res.status(200).json({message: "Product deleted from supplier"});
  } catch (error) {
    throw new Error(error);
  }
})

const updateSupplierByProduct = asyncHandler(async (req,res)=>{


  const {supplier_id, supplier_name, supplier_email, supplier_phone, supplier_address} = req.body.supplierDetails;
  console.log("awa");
  const productIds = req.body.productIds;

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    const updateSupplierQuery = "UPDATE supplier SET supplier_name = ?, supplier_email = ?, supplier_phone = ?, supplier_address = ? WHERE supplier_id = ?";
    await connection.execute(updateSupplierQuery, [supplier_name, supplier_email, supplier_phone, supplier_address, supplier_id]);

    const deleteAssociationsQuery = "DELETE FROM supplier_products WHERE supplier_id = ?";
    await connection.execute(deleteAssociationsQuery, [supplier_id]);



    const associateProductsQuery = "INSERT INTO supplier_products (product_id, supplier_id) VALUES (?, ?)";
    for (let productId of productIds) {
      await connection.execute(associateProductsQuery, [productId, supplier_id]);
    }

    await connection.commit();
    connection.release();
    return res.status(200).json({message: "Supplier updated and associated with products"});
  } catch (error) {
    throw new Error(error);
  }
})

const getProductsFromSupplierId = asyncHandler(async (req,res) =>{
  const {supplierId} = req.params;
  try {
    const connection = await pool.getConnection();
    const getProductsQuery = `
    SELECT
    supplier_products.supplier_products_id,
    supplier_products.product_id,
    supplier_products.supplier_id,
    product.p_id,
    product.p_title,
    product.p_slug,
    product.p_description,
    product.brand,
    product.quantity,
    product.price,
    product.sold,
    product.total_rating,
    product.category_id,
    product.created_at,
    supplier.supplier_name,
    supplier.supplier_email,
    supplier.supplier_phone,
    supplier.supplier_address,
    image.image_id,
    image.image_link,
    image.asset_id,
    image.public_id
  FROM
    supplier_products
  LEFT JOIN
    product ON supplier_products.product_id = product.p_id
  LEFT JOIN
    supplier ON supplier_products.supplier_id = supplier.supplier_id
  LEFT JOIN
    image ON product.p_id = image.product_id
  WHERE
    supplier.supplier_id = ?;
      `;
    const [productsResult] = await connection.execute(getProductsQuery, [supplierId]);
    const uniqueProducts = productsResult.reduce((acc, product) => {
      // Find this product in the accumulator array
      const existingProduct = acc.find(p => p.p_id === product.p_id);
    
      if (existingProduct) {
        // If this product is already in the accumulator, add this image to its images array
        existingProduct.images.push({
          image_id: product.image_id,
          image_link: product.image_link,
          asset_id: product.asset_id,
          public_id: product.public_id
        });
      } else {
        // If this product is not in the accumulator, add it to the accumulator
        // Also create an images array for this product
        acc.push({
          ...product,
          images: [{
            image_id: product.image_id,
            image_link: product.image_link,
            asset_id: product.asset_id,
            public_id: product.public_id
          }]
        });
      }
    
      return acc;
    }, []);
    
    connection.release();
    return res.status(200).json(uniqueProducts);
  } catch (error) {
    throw new Error(error);
  }
})

const getSupplierbyDetails = asyncHandler(async (req,res) => {
  const {id} = req.params;
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `
      SELECT 
      s.*,
      sp.product_id
      FROM supplier s
      LEFT JOIN supplier_product sp ON s.supplier_id = sp.supplier_id
      WHERE s.supplier_id = ?
      `, [id]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
})



module.exports = {
  createSupplier,
  getAllSuppliers,
  getASupplier,
  deleteProductFromSupplierByID,
  updateSupplierByProduct,
  getProductsFromSupplierId,
  getSupplierbyDetails
};
