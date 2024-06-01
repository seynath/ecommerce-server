const asyncHandler = require("express-async-handler");
const {db} = require("../config/db")


const createEnquiry = asyncHandler(async (req, res) => {
  console.log(req.body);

  let connection;
  try {
    const {enquiry, orderId} = req.body;

    connection = await pool.getConnection();

    const createEnquirySQL = `INSERT INTO enquiry (order_id,message) VALUES (?, ?)`;
    const [enquiryList] = await connection.execute(createEnquirySQL, [orderId, enquiry]);

    if (enquiryList.length === 0) {
      res.status(400);
      throw new Error('Enquiry not created');
    }

    res.status(201).json(enquiryList);
  } catch(error) {
    res.status(500).json({ message: "Error creating enquiry" });
  } finally {
    if (connection) connection.release();
  }
});




const updateEnquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const updatedEnquiry = await Enquiry.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.json(updatedEnquiry);
  } catch (error) {
    throw new Error(error);
  }
});

const changeEnquiryStatus = asyncHandler (async (req,res)=>{

  console.log(req.body);
  const {id, enqData} = req.body;

  try {
    const connection = await pool.getConnection()
    const updateEnqSQL = 'UPDATE enquiry SET enquiry_status = ? WHERE enquiry_id = ?';
    const [updateEnq] = await connection.execute(updateEnqSQL, [enqData, id]);
    res.status(201).json(updateEnq);
  } catch (error) {
    
    res.status(401).json({ message: error.message });
  }
  finally{
    await connection.release()

  }})
const deleteEnquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {

    const connection = await pool.getConnection()
    const deleteEnqSQL = 'DELETE FROM enquiry WHERE enquiry_id = ?';
    const [deletedEnquiry] = await connection.execute(deleteEnqSQL, [id])

    if(deletedEnquiry.length === 0){
      res.status(400);
      throw new Error('Enquiry not deleted');
    }

    res.status(201).json(deletedEnquiry);
  } catch (error) {
    throw new Error(error);
  } finally{
    await connection.release()

  
  }
});
const getallEnquiry = asyncHandler(async (req, res) => {
  try {
    const connection = await pool.getConnection()
    const getAllEnqSQL = 'SELECT * FROM enquiry';
    const [getaEnquiry] = await connection.execute(getAllEnqSQL)
    res.json(getaEnquiry);
  } catch (error) {
    throw new Error(error);
  }
});
const getEnquiry = asyncHandler(async (req, res) => {
  const {orderId} = req.params;
  console.log(orderId);
  console.log("moodaya");
  try {
    const connection = await pool.getConnection()

    const getAllEnqSQL = 'SELECT * FROM enquiry WHERE order_id = ?';
    const [getallEnquiry] = await connection.execute(getAllEnqSQL, [orderId]);
    res.status(200).json(getallEnquiry);
  
  
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally{
    await connection.release()

  }
});
module.exports = {
  createEnquiry,
  updateEnquiry,
  deleteEnquiry,
  getEnquiry,
  getallEnquiry,
  changeEnquiryStatus
};
