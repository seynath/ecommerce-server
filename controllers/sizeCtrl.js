const asyncHandler = require("express-async-handler");
const { pool, db } = require("../config/db");


const createSize = asyncHandler(async (req, res) => {
  const sizeName = req.body.title;

  try {

    const sql = "SELECT * FROM size WHERE size_name = ?";

    const existingSize = await new Promise(
      (resolve, reject) => {
        db.query(
          sql,
          [sizeName],
          (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          }
        );
      }
    );
    
    if (existingSize.length > 0) {
      return res.status(400).json({ message: "Size already exists" });
    }

    const insertSizeQuery = "INSERT INTO size (size_name) VALUES (?)";

    const insertResult = await new Promise(
      (resolve, reject) => {
        db.query(
          insertSizeQuery,
          [sizeName],
          (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          }
        );
      }
    );
    
 
    const sizeId = insertResult.insertId;
    console.log(sizeId);
    const getSizeQuery = "SELECT * FROM size WHERE size_name = ?";

    const sizeRows =  await new Promise(
      (resolve, reject) => {
        db.query(
          getSizeQuery,
          [sizeName],
          (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          }
        );
      }
    )
    
    const newSize = sizeRows[0];

    return res.status(200).json(newSize);

  } catch (error) {
    throw new Error(error);
  }
});

const getallSize  = asyncHandler ( async (req,res) =>{

  try{


    const sql = "SELECT * FROM size";
    const sizes = await new Promise(
      (resolve, reject) => {
        db.query(
          sql,
          (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          }
        );
        
      }
      )
    res.status(200).json(sizes);
  }
  catch(err){
    throw new Error(err)
  }
})






module.exports = {
  createSize,
  getallSize
  };