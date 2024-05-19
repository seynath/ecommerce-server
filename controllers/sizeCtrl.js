const asyncHandler = require("express-async-handler");
const { pool } = require("../config/db");


const createSize = asyncHandler(async (req, res) => {
  const sizeName = req.body.title;

  try {
    const connection = await pool.getConnection();

    const sql = "SELECT * FROM size WHERE size_name = ?";
    const [existingSize] = await connection.execute(sql, [sizeName]);

    if (existingSize.length > 0) {
      connection.release();
      return res.status(400).json({ message: "Size already exists" });
    }

    const insertSizeQuery = "INSERT INTO size (size_name) VALUES (?)";
    const [insertResult] = await connection.execute(insertSizeQuery, [
      sizeName
    ]);

    const sizeId = insertResult.insertId;
    console.log(sizeId);
    const getSizeQuery = "SELECT * FROM size WHERE size_name = ?";
    const [sizeRows] = await connection.execute(getSizeQuery, [sizeName]);
    const newSize = sizeRows[0];

    connection.release();
    return res.json(newSize);

  } catch (error) {
    throw new Error(error);
  }
});

const getallSize  = asyncHandler ( async (req,res) =>{

  try{
    const connection = await pool.getConnection()

    const sql = "SELECT * FROM size";
    const [sizes] = await connection.execute(sql);
    connection.release();
    res.json(sizes);
  }
  catch(err){
    throw new Error(err)
  }
})






module.exports = {
  createSize,
  getallSize
  };