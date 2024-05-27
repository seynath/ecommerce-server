const express = require("express");
const {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplier,
  getAllSuppliers,
  getASupplier,
  deleteProductFromSupplierByID,
  updateSupplierByProduct,
  getProductsFromSupplierId,
  getSupplierbyDetails
} = require("../controllers/supplierCtrl");
const { authMiddleware, isAdmin } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/", authMiddleware, isAdmin, createSupplier);
// router.put("/:id", authMiddleware, isAdmin, updateSize);
// router.delete("/:id", authMiddleware, isAdmin, deleteSize);
// router.get("/:id", getSize);
router.get("/", getAllSuppliers);
router.get("/get-supplier-products/:supplierId",getProductsFromSupplierId)
router.get("/getsupplierbyid/:supplierId", getASupplier)
// router.get("/getSupplierbyDetails/:supplierId", getSupplierbyDetails);
router.put("/delete-supplier-products", deleteProductFromSupplierByID)
router.put("/update-supplier", updateSupplierByProduct);
module.exports = router;
