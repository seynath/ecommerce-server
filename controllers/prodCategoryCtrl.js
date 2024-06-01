const asyncHandler = require('express-async-handler');
const { createConnection } = require('mysql2');
const { pool, db } = require('../config/db'); // adjust the path according to your project structure

const createCategory = async (req, res) => {
  try {
    // Extract category details from the request body
    const  cat_name  = req.body.title;


    // Connect to MySQL database
    // const connection = await pool.getConnection();

    // Check if the category name already exists
    const checkCategoryQuery = `
      SELECT *
      FROM category
      WHERE cat_name = ?
    `;
    const existingCategory = await new Promise(
      (resolve, reject) => {
        db.query(checkCategoryQuery, [cat_name], (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });
      }
    );

    
    // If the category name already exists, return an error
    if (existingCategory.length > 0) {

      return res.status(400).json({ message: "Category name already exists" });
    }

    // Insert a new category into the database
    const insertCategoryQuery = `
      INSERT INTO category (cat_name)
      VALUES (?)
    `;


    const insertResult = await new Promise(
      (resolve, reject) => {
        db.query(insertCategoryQuery, [cat_name], (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });
      }
    )


    // Fetch the newly inserted category from the database
    const categoryId = insertResult.insertId;
    const getCategoryQuery = `
      SELECT *
      FROM category
      WHERE cat_id = ?
    `;


    const categoryRows = await new Promise(
      (resolve, reject) => {
        db.query(getCategoryQuery, [categoryId], (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });
      }
    )

    const newCategory = categoryRows[0];


    // Return the newly created category
    res.status(200).json(newCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create category" });
  }
};
// const createCategory = async (req, res) => {
//   try {
//     // Extract category details from the request body
//     const  cat_name  = req.body.title;


//     // Connect to MySQL database
//     // const connection = await pool.getConnection();

//     // Check if the category name already exists
//     const checkCategoryQuery = `
//       SELECT *
//       FROM category
//       WHERE cat_name = ?
//     `;
//     const existingCategory = await new Promise(
//       (resolve, reject) => {
//         pool.query(checkCategoryQuery, [cat_name], (error, results) => {
//           if (error) {
//             reject(error);
//           } else {
//             resolve(results);
//           }
//         });
//       }
//     );

    


//     const [existingCategory] = await connection.execute(checkCategoryQuery, [cat_name]);

//     // If the category name already exists, return an error
//     if (existingCategory.length > 0) {
//       connection.release();

//       return res.status(400).json({ message: "Category name already exists" });
//     }

//     // Insert a new category into the database
//     const insertCategoryQuery = `
//       INSERT INTO category (cat_name)
//       VALUES (?)
//     `;
//     const [insertResult] = await connection.execute(insertCategoryQuery, [cat_name]);

//     // Fetch the newly inserted category from the database
//     const categoryId = insertResult.insertId;
//     const getCategoryQuery = `
//       SELECT *
//       FROM category
//       WHERE cat_id = ?
//     `;
//     const [categoryRows] = await connection.execute(getCategoryQuery, [categoryId]);
//     const newCategory = categoryRows[0];
//     connection.release();


//     // Return the newly created category
//     res.status(200).json(newCategory);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to create category" });
//   }
// };


const updateCategory = async (req, res) => {
  const { id } = req.params;
  // Validate ID if needed
  // validateMongoDbId(id);

  // Extract data from request body
  const { cat_name, cat_description } = req.body;

  try {
    // Connect to MySQL database
    const connection = await pool.getConnection();
    

    // Check if the category name already exists (excluding the current category being updated)
    const checkCategoryQuery = `
      SELECT *
      FROM category
      WHERE cat_name = ? AND cat_id != ?
    `;
    const [existingCategory] = await connection.execute(checkCategoryQuery, [cat_name, id]);

    // If the category name already exists (excluding the current category being updated), return an error
    if (existingCategory.length > 0) {
      return res.status(400).json({ message: "Category name already exists" });
    }

    // Update category in the database
    const updateCategoryQuery = "UPDATE category SET cat_name = ?, cat_description = ? WHERE cat_id = ?";
    const [result] = await connection.execute(updateCategoryQuery, [cat_name, cat_description, id]);

    // Check if the category was updated successfully
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Fetch the updated category from the database
    const getCategoryQuery = "SELECT * FROM category WHERE cat_id = ?";
    const [updatedCategory] = await connection.execute(getCategoryQuery, [id]);

    // Send the updated category as response
    res.status(200).json(updatedCategory[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const deletedCategory = await PCategory.findByIdAndDelete(id);
    res.json(deletedCategory);
  } catch (error) {
    throw new Error(error);
  }
});

const getCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    sql = "SELECT * FROM category WHERE cat_id = ?"

    const getaCategory = await new Promise(
      (resolve, reject) => {
        db.query(sql, [id], (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });
      }
    );

    console.log("category rows", getaCategory);

    res.status(200).json(getaCategory);
  }
  catch (error) {
    throw new Error(error);
  }
});


const getallCategory = asyncHandler(async (req, res) => {
  try {
    sql = "SELECT * FROM category"

    const getallCategory = await new Promise(
      (resolve, reject) => {
        db.query(sql, (error,results)=>{
          if(error){
            reject(error);
          }else{
            resolve(results);
          }
        }
    )
  })
    // console.log("category rows", getallCategory);

    res.status(200).json(getallCategory);
  } catch (error) {
    throw new Error(error);
  }
});
// const getallCategory = asyncHandler(async (req, res) => {
//   try {
//     const connection = await pool.getConnection();
//     sql = "SELECT * FROM category"

//     const [getallCategory] = await connection.execute(sql);
//     // console.log("category rows", getallCategory);

//     res.status(200).json(getallCategory);
//   } catch (error) {
//     throw new Error(error);
//   }
// });
module.exports = {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategory,
  getallCategory,
};
