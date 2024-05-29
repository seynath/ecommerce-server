const asyncHandler = require("express-async-handler");
const { pool } = require("../config/db");


const createColor = asyncHandler(async (req, res) => {
  const colorName = req.body.title;
  const colorCode = req.body.code;

  try {
    const connection = await pool.getConnection();

    const sql = "SELECT * FROM color WHERE col_code = ?";
    const [existingColor] = await connection.execute(sql, [colorCode]);

    if (existingColor.length > 0) {
      connection.release();
      return res.status(400).json({ message: "Color code already exists" });
    }

    const insertColorQuery = "INSERT INTO color (col_code, col_name) VALUES (?, ?)";
    const [insertResult] = await connection.execute(insertColorQuery, [
      colorCode, colorName
    ]);

    const colorId = insertResult.insertId;
    console.log(colorId);
    const getColorQuery = "SELECT * FROM color WHERE col_code = ?";
    const [colorRows] = await connection.execute(getColorQuery, [colorCode]);
    const newColor = colorRows[0];

    connection.release();
    return res.status(200).json(newColor);

  } catch (error) {
    throw new Error(error);
  }
});


const updateColor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const updatedColor = await Color.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.json(updatedColor);
  } catch (error) {
    throw new Error(error);
  }
});
const deleteColor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const deletedColor = await Color.findByIdAndDelete(id);
    res.json(deletedColor);
  } catch (error) {
    throw new Error(error);
  }
});
const getColor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const getaColor = await Color.findById(id);
    res.json(getaColor);
  } catch (error) {
    throw new Error(error);
  }
});

const getallColor = asyncHandler(async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const sql = "SELECT * FROM color";
    const [colors] = await connection.execute(sql);
    connection.release();
    res.status(200).json(colors);
  } catch (error) {
    throw new Error(error);
  }
});

module.exports = {
  createColor,
  updateColor,
  deleteColor,
  getColor,
  getallColor,
};
