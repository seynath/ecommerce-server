const asyncHandler = require("express-async-handler");
const generateToken = require("../config/jwtToken");
const generateRefreshToken = require("../config/refreshtoken");
const jwt = require("jsonwebtoken");
const sendEmail = require("../controllers/emailCtrl");
const crypto = require("crypto");
const uniqid = require("uniqid");
const { pool } = require("../config/db"); // import the connection pool
const saltRounds = 10;
const bcrypt = require("bcrypt");



const createUser = asyncHandler(async (req, res) => {
  try {
    const { firstname, lastname, email, mobile, password } = req.body;
    console.log(req.body);
    const role = "user";
    const address = " ";

    // Get a connection from the pool
    const connection = await pool.getConnection();

    // Check if user with the given email already exists
    const [existingUsers] = await connection.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (existingUsers.length > 0) {
      connection.release();
      return res.status(400).json({ message: "User Already Exists" });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create a new user
    const result = await connection.execute(
      "INSERT INTO users (firstname, lastname, email, mobile, password, role, address) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [firstname, lastname, email, mobile, hashedPassword, role, address]
    );

    // Create an empty cart for the new user
    await connection.execute("INSERT INTO cart (user_id) VALUES (?)", [
      result[0].insertId,
    ]);

    connection.release();

    res.status(201).json({
      message: "User created successfully",
      userId: result[0].insertId,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});






const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  try {
    // Get a connection from the pool
    const connection = await pool.getConnection();

    // Check if user with the given email exists
    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    const user = rows[0];
    // if (!user) {
    //   connection.release();
    //   throw new Error("User not found")}

    if (rows.length === 0 || !user) {
      connection.release();
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    // Compare the provided password with the hashed password stored in the database
    const passwordMatched = await bcrypt.compare(password, user.password);

    if (!passwordMatched) {
      connection.release();
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    // Generate a JSON Web Token (JWT) for the user
    const token = generateToken(user.id);
    // store the token in user table , refreshToken field
    const [rows1] = await connection.execute(
      "UPDATE users SET refreshToken = ? where id = ?",
      [token, user.id]
    );

    if (rows1.length === 0) {
      connection.release();
      return res.status(401).json({ message: "Server Error" });
    }

    connection.release();

    // Send the user data and token as a response
    res.status(200).json({
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      mobile: user.mobile,
      isAdmin: user.isAdmin,
      token: token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Get a MySQL connection from the pool
    const connection = await pool.getConnection();

    // Execute a SELECT query to find the user with the provided email
    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    const findAdmin = rows[0];
    console.log(findAdmin);

    if (!findAdmin) {
      connection.release();
      throw new Error("Email not found");
    }

    // Check if the user is an admin
    if (findAdmin.role !== "admin") {
      connection.release();
      throw new Error("Unauthorized access");
    }

    // Compare the provided password with the hashed password stored in the database
    const passwordMatched = await bcrypt.compare(password, findAdmin.password);

    if (!passwordMatched) {
      connection.release();
      throw new Error("Incorrect password");
    }

    // Generate a refresh token
    const refreshToken = await generateRefreshToken(findAdmin.id);
    console.log(refreshToken);

    // Update the user's refresh token in the database
    const [rows1] = await connection.execute(
      "UPDATE users SET refreshToken = ? WHERE id = ?",
      [refreshToken, findAdmin.id]
    );

    if (rows1.length === 0) {
      connection.release();
      throw new Error("Server Error");
    }

    connection.release();

    // Set the refresh token in a cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    });

    // Send the user's information along with an access token in the response
    res.json({
      _id: findAdmin.id,
      firstname: findAdmin.firstname,
      lastname: findAdmin.lastname,
      email: findAdmin.email,
      mobile: findAdmin.mobile,
      isAdmin: findAdmin.role,
      token: refreshToken,
    });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};
const loginCashier = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Get a MySQL connection from the pool
    const connection = await pool.getConnection();

    // Execute a SELECT query to find the user with the provided email
    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    const findCashier = rows[0];
    console.log("athule");
    console.log(findCashier);

    if (!findCashier) {
      connection.release();
      throw new Error("Email not found");
    }

    // Check if the user is an admin
    if (findCashier.role !== "cashier") {
      connection.release();
      throw new Error("Unauthorized access");
    }

    // Compare the provided password with the hashed password stored in the database
    const passwordMatched = await bcrypt.compare(
      password,
      findCashier.password
    );

    if (!passwordMatched) {
      connection.release();
      throw new Error("Incorrect password");
    }

    // Generate a refresh token
    const refreshToken = await generateRefreshToken(findCashier.id);
    console.log(refreshToken);

    // Update the user's refresh token in the database
    const [rows1] = await connection.execute(
      "UPDATE users SET refreshToken = ? WHERE id = ?",
      [refreshToken, findCashier.id]
    );

    if (rows1.length === 0) {
      connection.release();
      throw new Error("Server Error");
    }

    connection.release();

    // Set the refresh token in a cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    });

    // Send the user's information along with an access token in the response
    res.json({
      _id: findCashier.id,
      firstname: findCashier.firstname,
      lastname: findCashier.lastname,
      email: findCashier.email,
      mobile: findCashier.mobile,
      isAdmin: findCashier.role,
      token: refreshToken,
    });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

const getallUser = async (req, res) => {
  try {
    // Get a MySQL connection from the pool
    const connection = await pool.getConnection();

    // Execute a SELECT query to fetch all users
    const [rows] = await connection.execute("SELECT * FROM users");
    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({ message: "No Users Found" });
    }
    connection.release();

    // Send the fetched users in the response
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



const getaUser = async (req, res) => {
  const { id } = req.params;

  try {
    // Get a MySQL connection from the pool
    const connection = await pool.getConnection()
    // Execute a SELECT query to fetch the user with the provided ID
    const [rows] = await connection.execute("SELECT * FROM users WHERE id = ?", [id]);

    connection.release();

    // Check if user with the given ID exists
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send the fetched user in the response
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



const deleteaUser = async (req, res) => {
  const { id } = req.params;

  try {
    // Get a MySQL connection from the pool
    const connection = req.connection;
    await checkConnection(connection);

    // Execute a DELETE query to delete the user with the provided ID
    await connection.promise().query("DELETE FROM users WHERE id = ?", [id]);

    connection.release();

    // Send a success response
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//delete user
// const deleteaUser = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   validateMongoDbId(id);

//   try {
//     const deleteaUser = await User.findByIdAndDelete(id);
//     res.json({
//       deleteaUser,
//     });
//   } catch (error) {
//     throw new Error(error);
//   }
// });

const updatedUser = async (req, res) => {
  // Retrieve the user ID from the request parameters
  // const { id } = req.params;
  const { id } = req.user;
  console.log(id);

  try {
    // Get user data from request body
    console.log(req.body);
    const { firstname, lastname, email, mobile } = req.body;

    // Get a MySQL connection from the pool
    const connection = await pool.getConnection();

    // Execute an UPDATE query to update the user's information
    const [result] = await connection.execute(
      "UPDATE users SET firstname = ?, lastname = ?, email = ?, mobile = ? WHERE id = ?",
      [firstname, lastname, email, mobile, id] // Use 'id' instead of '_id'
    );

    connection.release();

    // Check if user was updated successfully
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send the updated user data in the response
    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const saveAddress = async (req, res) => {
  // Retrieve the user ID from the request parameters

  //const { id } = req.user;
  const { id } = req.params;

  try {
    // Get the address from the request body
    const { address } = req.body;

    // Get a MySQL connection from the pool
    const connection = req.connection;
    await checkConnection(connection);

    // Execute an UPDATE query to update the user's address
    const [result] = await connection
      .promise()
      .query("UPDATE users SET address = ? WHERE id = ?", [address, id]);

    connection.release();

    // Check if user was updated successfully
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send the updated user data in the response
    res.json({ message: "Address saved successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const blockUser = async (req, res) => {
  // Retrieve the user ID from the request parameters
  const { id } = req.params;

  try {
    // Get a MySQL connection from the pool
    const connection = req.connection;
    await checkConnection(connection);

    // Execute an UPDATE query to block the user
    const [result] = await connection
      .promise()
      .query("UPDATE users SET isBlocked = ? WHERE id = ?", [true, id]);

    connection.release();

    // Check if user was blocked successfully
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send the response
    res.json({ message: "User Blocked" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const unblockUser = async (req, res) => {
  // Retrieve the user ID from the request parameters
  const { id } = req.params;

  try {
    // Get a MySQL connection from the pool
    const connection = req.connection;
    await checkConnection(connection);

    // Execute an UPDATE query to unblock the user
    const [result] = await connection
      .promise()
      .query("UPDATE users SET isBlocked = ? WHERE id = ?", [false, id]);

    connection.release();

    // Check if user was unblocked successfully
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send the response
    res.json({ message: "User Unblocked" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const handleRefreshToken = async (req, res) => {
  try {
    // Extract the 'refreshToken' from cookies in the request
    const cookie = req.cookies;

    // Check if there is a 'refreshToken' in the cookies
    if (!cookie?.refreshToken) {
      // If not, send a 401 Unauthorized response with an error message
      return res.status(401).json({ message: "No Refresh Token in Cookies" });
    }

    // Retrieve the 'refreshToken' from the cookies
    const refreshToken = cookie.refreshToken;

    // Get a MySQL connection from the pool
    const connection = req.connection;
    await checkConnection(connection);

    // Execute a SELECT query to find the user with the provided 'refreshToken'
    const [rows] = await connection
      .promise()
      .query("SELECT * FROM users WHERE refreshToken = ?", [refreshToken]);
    const user = rows[0];

    connection.release();

    // If no user is found or the 'refreshToken' doesn't match, send an error response
    if (!user) {
      return res
        .status(401)
        .json({ message: "No Refresh token present in db or not matched" });
    }

    // Verify the 'refreshToken' using the JWT_SECRET
    jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
      // If there's an error or the user ID in the token doesn't match the user ID in the database
      if (err || user.id !== decoded.id) {
        // Send an error response
        return res
          .status(401)
          .json({ message: "There is something wrong with the refresh token" });
      }

      // If verification is successful, generate a new access token
      const accessToken = generateToken(user.id);

      // Send the new access token in the response
      res.json({ accessToken });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const cookie = req.cookies;
    if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies");
    const refreshToken = cookie.refreshToken;

    // Get a MySQL connection from the pool
    const connection = req.connection;
    await checkConnection(connection);

    // Execute a SELECT query to find the user with the provided 'refreshToken'
    const [rows] = await connection
      .promise()
      .query("SELECT * FROM users WHERE refreshToken = ?", [refreshToken]);
    const user = rows[0];

    // Clear the refreshToken cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
    });

    // If no user is found, send a 204 No Content response
    if (!user) {
      return res.sendStatus(204); // No Content
    }

    // Update the user's refreshToken to an empty string
    await connection
      .promise()
      .query("UPDATE users SET refreshToken = ? WHERE id = ?", ["", user.id]);

    connection.release();

    return res.sendStatus(204); // No Content
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// const logout = asyncHandler(async (req, res) => {
//   const cookie = req.cookies;
//   if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies");
//   const refreshToken = cookie.refreshToken;
//   const user = await User.findOne({ refreshToken });

//   if (!user) {
//     res.clearCookie("refreshToken", {
//       httpOnly: true,
//       secure: true,
//     });
//     return res.sendStatus(204); // No Content
//   }

//   // Update the user's refreshToken to an empty string
//   // methana thamai case eke thiyennne
//   await User.findOneAndUpdate(
//     { refreshToken },
//     {
//       $set: { refreshToken: "" },
//     }
//   );

//   // Clear the refreshToken cookie
//   res.clearCookie("refreshToken", {
//     httpOnly: true,
//     secure: true,
//   });

//   return res.sendStatus(204); // No Content
// });

const updatePassword = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { password } = req.body;
  validateMongoDbId(_id);
  const user = await User.findById(_id);
  if (password) {
    user.password = password;
    const updatedPassword = await user.save();
    res.json(updatedPassword);
  } else {
    res.json(user);
  }
});



const forgotPasswordToken = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  const connection = await pool.getConnection()
  try {
    
    // Find the user by email
    const [rows] = await connection.execute("SELECT * FROM users WHERE email = ?", [email]);
    const user = rows[0];
    
    if (!user) {
      throw new Error("User not found with this email");
    }
    
    // Generate a password reset token
    const resetToken = crypto.createHash("sha256").update(Math.random().toString(36)).digest("hex");
    console.log(resetToken);
    
    // Update the user's password reset token in the database
    await connection.execute(
      "UPDATE users SET passwordResetToken = ?, passwordResetExpires = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?",
      [resetToken, user.id]
    );
    
    console.log("hii");
    // Send email with reset link
    const resetURL = `Hi, Please follow this link to reset Your Password. This link is valid till 10 minutes from now. <a href='http://localhost:3001/reset-password/${resetToken}'>Click Here</>`;
    const data = {
      to: email,
      text: "Hey User",
      subject: "Forgot Password Link",
      htm: resetURL,
    };
    sendEmail(data);

    res.status(200).json({ message: "Password reset token sent to your email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


const hashPassword = async (password) => {
  const saltRounds = 10; // Number of salt rounds for bcrypt
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
};

const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;

  try {
    // Hash the provided token
    // const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find the user by hashed token and check token expiration
    const connection = await pool.getConnection()

    const [rows] = await connection.execute(
        "SELECT * FROM users WHERE passwordResetToken = ? AND passwordResetExpires > NOW()",
        [token]
      );
    const user = rows[0];

    if (!user) {
      throw new Error("Token expired or invalid");
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update the user's password and reset token fields in the database
    await connection.execute(
        "UPDATE users SET password = ?, passwordResetToken = NULL, passwordResetExpires = NULL WHERE id = ?",
        [hashedPassword, user.id]
      );

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


const getWishlist = asyncHandler(async (req, res) => {
  const { id } = req.user;

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM wishlist WHERE user_id = ?",
      [id]
    );
    if (rows.length === 0) {
      connection.release();
      return res.status(204).json([{ message: "No Wishlist Found" }]);
    }
    connection.release();
    res.status(201).json(rows);
  } catch (error) {
    throw new Error(error);
  }
});



//add to cart
const userCart = asyncHandler(async (req, res) => {
  const { size_color_quantity_id, quantity, product_total } = req.body;
  const { id } = req.user;

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM cart WHERE user_id = ?",
      [id]
    );
    if (rows.length === 0) {
      await connection.execute("INSERT INTO cart (user_id) VALUES (?)", [id]);
    }
    const [rows1] = await connection.execute(
      "SELECT * FROM cart WHERE user_id = ?",
      [id]
    );
    const cart_id = rows1[0].cart_id;
    const [rows2] = await connection.execute(
      "SELECT * FROM size_color_quantity WHERE size_color_quantity_id = ?",
      [size_color_quantity_id]
    );
    let availableQuantity = rows2[0].quantity;

    if (availableQuantity < quantity) {
      connection.release();
      return res.status(400).json({ message: "Not enough quantity available" });
    }

    const [rows3] = await connection.execute(
      "SELECT * FROM cart_items WHERE cart_id = ? AND size_color_quantity_id = ?",
      [cart_id, size_color_quantity_id]
    );
    if (rows3.length === 0) {
      await connection.execute(
        "INSERT INTO cart_items (cart_id, size_color_quantity_id, quantity, product_total) VALUES (?, ?, ?, ?)",
        [cart_id, size_color_quantity_id, quantity, product_total]
      );
    } else {
      await connection.execute(
        "UPDATE cart_items SET quantity = ?, product_total= ? WHERE cart_id = ? AND size_color_quantity_id = ?",
        [quantity, product_total, cart_id, size_color_quantity_id]
      );
    }
    connection.release();

    res.status(200).json({ message: "Cart Data Received" });
  } catch (error) {
    throw new Error(error);
  }
});



const getUserCart = asyncHandler(async (req, res) => {
  const { id } = req.user;

  try {
    const connection = await pool.getConnection();

    // Get cart and cart_items data in a single query
    const [rows] = await connection.execute(
      "SELECT c.*, ci.* FROM cart c LEFT JOIN cart_items ci ON c.cart_id = ci.cart_id WHERE c.user_id = ?",
      [id]
    );

    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({ message: "No Cart Found" });
    }

    let productDetailsPromises = [];
    for (let i = 0; i < rows.length; i++) {
      let row = rows[i];
      if (row.size_color_quantity_id) {
        // add null check for size_color_quantity_id
        try {
          const [productRows] = await connection.execute(
            `SELECT p.*, scq.size_id, scq.color_code, scq.quantity as size_color_quantity, scq.unit_price, s.size_name, c.col_name, i.image_link
        FROM product p
        JOIN size_color_quantity scq ON p.p_id = scq.product_id
        JOIN size s ON s.size_id = scq.size_id
        JOIN color c ON c.col_code = scq.color_code
        JOIN image i ON i.product_id = p.p_id
        WHERE scq.size_color_quantity_id = ?
        `,
            [row.size_color_quantity_id]
          );

          const availableQuantity = productRows[0].size_color_quantity;
          const cartQuantity = row.quantity;

          // Update cart quantity if it's greater than the available quantity
          if (cartQuantity > availableQuantity) {
            await connection.execute(
              "UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?",
              [availableQuantity, row.cart_item_id]
            );
            row.quantity = availableQuantity;
          }

          productDetailsPromises.push({
            ...row,
            productDetails: productRows[0],
          });
        } catch (error) {
          console.error(error);
          // Handle the error appropriately, maybe by returning an empty object or null
          productDetailsPromises.push(null);
        }
      }
    }

    const cartWithProductDetails = await Promise.all(productDetailsPromises);

    connection.release();
    res.status(200).json(cartWithProductDetails.filter(Boolean)); // filter out null values
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
});


const removeFromCartItem = asyncHandler(async (req, res) => {
  const { cartItemId } = req.params;
  const { id } = req.user;
  console.log(cartItemId);
  try {
    const connection = await pool.getConnection();
    const sql = `DELETE FROM cart_items WHERE cart_item_id = ?`;

    const [rows] = await connection.execute(sql, [cartItemId]);

    console.log(rows);
    if (rows.length === 0) {
      res.status(400).json({ message: "Cart Item Not Found" });
      connection.release();
    }
    connection.release();

    res.status(200).json({ message: "Cart Item Removed" });
  } catch (error) {}
});



const applyCoupon = asyncHandler(async (req, res) => {
  const { coupon } = req.body;
  const { _id } = req.user;
  validateMongoDbId(_id);
  const validCoupon = await Coupon.findOne({ name: coupon });
  if (validCoupon === null) {
    throw new Error("Invalid Coupon");
  }
  const user = await User.findOne({ _id });
  let { cartTotal } = await Cart.findOne({
    orderby: user._id,
  }).populate("products.product");
  let totalAfterDiscount = (
    cartTotal -
    (cartTotal * validCoupon.discount) / 100
  ).toFixed(2);
  await Cart.findOneAndUpdate(
    { orderby: user._id },
    { totalAfterDiscount },
    { new: true }
  );
  res.json(totalAfterDiscount);
});

const createOrder = asyncHandler(async (req, res) => {
  console.log("aawa");
  const {
    firstName,
    lastName,
    email,
    mobile,
    shippingAptNo,
    shippingAddress,
    shippingCity,
    shippingState,
    shippingZipcode,
    shippingCountry,
    billingAptNo,
    billingAddress,
    billingCity,
    billingState,
    billingZipcode,
    billingCountry,
    paymentMethod,
    message,
    totalPrice,
  } = req.body;

  console.log(
    firstName,
    lastName,
    email,
    mobile,
    shippingAptNo,
    shippingAddress,
    shippingCity,
    shippingState,
    shippingZipcode,
    shippingCountry,
    billingAptNo,
    billingAddress,
    billingCity,
    billingState,
    billingZipcode,
    billingCountry,
    paymentMethod,
    message,
    totalPrice
  );

  const { id } = req.user;
  const orderStatus = "Processing";

  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {

    const [order_rows] = await connection.execute(
      "INSERT INTO orders (user_id, payment_method, email, mobile, order_status, message, shipping_apt_no, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_country, billing_apt_no, billing_address, billing_city, billing_state, billing_zip, billing_country, total_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        id,
        paymentMethod,
        email,
        mobile,
        orderStatus,
        message,
        shippingAptNo,
        shippingAddress,
        shippingCity,
        shippingState,
        shippingZipcode,
        shippingCountry,
        billingAptNo,
        billingAddress,
        billingCity,
        billingState,
        billingZipcode,
        billingCountry,
        totalPrice,
      ]
    );
    console.log(order_rows.insertId);

    const [rows] = await connection.execute(
      "SELECT * FROM cart WHERE user_id = ?",
      [id]
    );
    if (rows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "No Cart Found" });
    }
    const cart_id = rows[0].cart_id;

    const [rows1] = await connection.execute(
      "SELECT * FROM cart_items WHERE cart_id = ?",
      [cart_id]
    );
    console.log(rows1);

    // wada
    if (rows1.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "No Cart Items Found" });
    }

    //     const promises = rows1.map(async (item) => {
    //       console.log(item.cart_item_id);
    //       console.log(item.size_color_quantity_id);
    //       console.log(item.quantity);

    //       const [rows2] = await connection.execute(
    //         "SELECT quantity FROM size_color_quantity WHERE size_color_quantity_id = ?",
    //         [item.size_color_quantity_id]
    //       );
    //       console.log({"rows2": rows2});
    //       let availableQuantity = rows2[0].quantity;

    //       if (availableQuantity < item.quantity) {
    //         await connection.rollback();
    //         connection.release();
    //         return res
    //           .status(400)
    //           .json({ message: "Not enough quantity available" });
    //       }

    //       let newavailableQuantity = availableQuantity - item.quantity;
    //       const [rows3] = await connection.execute(
    //         "UPDATE size_color_quantity SET quantity = ? WHERE size_color_quantity_id = ?",
    //         [newavailableQuantity, item.size_color_quantity_id]
    //       );
    //       console.log({"rows3": rows3});

    //       // remove item from cart item table
    //       const [rows4] = await connection.execute(
    //         "DELETE FROM cart_items WHERE cart_item_id = ?",
    //         [item.cart_item_id]
    //       );
    //       console.log({"rows4": rows4});

    // console.log(order_rows);

    //       // add product to the orders_items table
    //       const [rows5] = await connection.execute(
    //         "INSERT INTO order_items (order_id, size_color_quantity_id, quantity) VALUES (?,?,?)",
    //         [order_rows.insertId, item.size_color_quantity_id, item.quantity]
    //       );
    //       console.log({"rows5": rows5});
    //       // update quantity in other customers' carts
    //       const [rows6] = await connection.execute(
    //         "UPDATE cart_items SET quantity = LEAST(quantity, ?) WHERE size_color_quantity_id = ?",
    //         [newavailableQuantity, item.size_color_quantity_id]
    //       );
    //       console.log({"rows6": rows6});

    //     });

    // let promises = [];
    // for (let i = 0; i < rows1.length; i++) {
    //   let item = rows1[i];
    //   console.log(item.cart_item_id);
    //   console.log(item.size_color_quantity_id);
    //   console.log(item.quantity);

    //   const [rows2] = await connection.execute(
    //     "SELECT quantity FROM size_color_quantity WHERE size_color_quantity_id = ?",
    //     [item.size_color_quantity_id]
    //   );
    //   console.log({ rows2: rows2 });
    //   let availableQuantity = rows2[0].quantity;

    //   if (availableQuantity < item.quantity) {
    //     await connection.rollback();
    //     connection.release();
    //     return res
    //       .status(400)
    //       .json({ message: "Not enough quantity available" });
    //   }

    //   let newavailableQuantity = availableQuantity - item.quantity;
    //   const [rows3] = await connection.execute(
    //     "UPDATE size_color_quantity SET quantity = ? WHERE size_color_quantity_id = ?",
    //     [newavailableQuantity, item.size_color_quantity_id]
    //   );
    //   console.log({ rows3: rows3 });

    //   // remove item from cart item table
    //   const [rows4] = await connection.execute(
    //     "DELETE FROM cart_items WHERE cart_item_id = ?",
    //     [item.cart_item_id]
    //   );
    //   console.log({ rows4: rows4 });

    //   console.log(order_rows);

    //   // add product to the orders_items table
    //   const [rows5] = await connection.execute(
    //     "INSERT INTO order_items (order_id, size_color_quantity_id, quantity) VALUES (?,?,?)",
    //     [order_rows.insertId, item.size_color_quantity_id, item.quantity]
    //   );
    //   console.log({ rows5: rows5 });
    //   // update quantity in other customers' carts
    //   const [rows6] = await connection.execute(
    //     "UPDATE cart_items SET quantity = LEAST(quantity, ?) WHERE size_color_quantity_id = ?",
    //     [newavailableQuantity, item.size_color_quantity_id]
    //   );
    //   console.log({ rows6: rows6 });
    // }
    
    for (let item of rows1) {
      console.log(item.cart_item_id);
      console.log(item.size_color_quantity_id);
      console.log(item.quantity);
      
      const [rows2] = await connection.execute(
        "SELECT quantity FROM size_color_quantity WHERE size_color_quantity_id = ?",
        [item.size_color_quantity_id]
      );
      console.log({ rows2: rows2 });
      let availableQuantity = rows2[0].quantity;
      
      if (availableQuantity < item.quantity) {
        await connection.rollback();
        connection.release();
        return res
        .status(400)
        .json({ message: "Not enough quantity available" });
      }
      
      let newavailableQuantity = availableQuantity - item.quantity;
      const [rows3] = await connection.execute(
        "UPDATE size_color_quantity SET quantity = ? WHERE size_color_quantity_id = ?",
        [newavailableQuantity, item.size_color_quantity_id]
      );
      console.log({ rows3: rows3 });
      
      // remove item from cart item table
      const [rows4] = await connection.execute(
        "DELETE FROM cart_items WHERE cart_item_id = ?",
        [item.cart_item_id]
      );
      console.log({ rows4: rows4 });
      
      console.log(order_rows);
      
      console.log(order_rows.insertId);
      console.log(item.size_color_quantity_id);
      console.log(item.quantity);
      // add product to the orders_items table
      const [rows5] = await connection.execute(
        "INSERT INTO order_items (order_id, size_color_quantity_id, quantity) VALUES (?,?,?)",
        [order_rows.insertId, item.size_color_quantity_id, item.quantity]
      );
      console.log({ rows5: rows5 });
      // update quantity in other customers' carts
      const [rows6] = await connection.execute(
        "UPDATE cart_items SET quantity = LEAST(quantity, ?) WHERE size_color_quantity_id = ?",
        [newavailableQuantity, item.size_color_quantity_id]
      );
      console.log({ rows6: rows6 });
    }




    // await Promise.all(promises);

    await connection.commit();
    connection.release();
    res.status(201).json({ message: "Order created successfully" });
  } catch (error) {
    console.log("jijiji");
    if (connection) {
      await connection
        .rollback()
        .catch(() => console.log("Error rolling back transaction"));
      connection.release();
    }
    // res.status(404).json(error)
    throw new Error(error);
  }
});

const createOrderCashier = asyncHandler(async (req, res) => {
  console.log("huuuu");
  const { products } = req.body;
  const { id } = req.user;
  let salesIdForFront;

  console.log(products);
  try {
    const connection = await pool.getConnection();

    // Begin transaction
    await connection.beginTransaction();

    // Insert into sales table
    const [sales_rows] = await connection.execute(
      "INSERT INTO sales (user_id) VALUES (?)",
      [req.user.id]
    );
    const sales_id = sales_rows.insertId;
    salesIdForFront = sales_id;

    // Insert into sales_items table and update size_color_quantity table
    const promises = products.map(async (product) => {
      const { size_color_quantity_id, quantity } = product;

      // Check available quantity
      const [rows] = await connection.execute(
        "SELECT quantity FROM size_color_quantity WHERE size_color_quantity_id = ?",
        [size_color_quantity_id]
      );
      let availableQuantity = rows[0].quantity;

      if (availableQuantity < quantity) {
        connection.release();
        return res
          .status(400)
          .json({ message: "Not enough quantity available" });
      }

      // Update quantity in size_color_quantity table
      let newavailableQuantity = availableQuantity - quantity;
      const [rows2] = await connection.execute(
        "UPDATE size_color_quantity SET quantity = ? WHERE size_color_quantity_id = ?",
        [newavailableQuantity, size_color_quantity_id]
      );

      // Insert into sales_items table
      const [rows3] = await connection.execute(
        "INSERT INTO sales_items (sales_id, size_color_quantity_id, quantity) VALUES (?,?,?)",
        [sales_id, size_color_quantity_id, quantity]
      );
    });

    await Promise.all(promises);

    // Commit transaction
    await connection.commit();

    const [rows4] = await connection.execute(
      "SELECT * FROM sales WHERE sales_id = ?",
      [salesIdForFront]
    );
    const salesOrder = rows4[0];
    console.log(salesOrder);

    connection.release();
    res
      .status(201)
      .json({ message: "Order created successfully", salesOrder: salesOrder });
  } catch (error) {
    throw new Error(error);
  }
});

const printBillCashier = asyncHandler(async (req, res) => {
  try {
    // console.log(req.params.salesOrderId);
    const salesOrderId = req.params.salesOrderId;

    // Fetch order details from the database using the order ID
    const order = await fetchOrderDetails(salesOrderId);
    // Generate the PDF using pdfmake
    console.log(order);

    // const pdfDoc = pdfMake.createPdf(pdfTemplate(order));
    // console.log(pdfDoc)

    res.status(200).send(order);
  } catch (error) {
    throw new Error(error);
  }
});

async function fetchOrderDetails(salesId) {
  const [salesRows] = await pool.execute(
    "SELECT * FROM sales WHERE sales_id = ?",
    [salesId]
  );
  // console.log(salesRows);

  const sales = salesRows[0];

  const [salesItemRows] = await pool.execute(
    "SELECT size_color_quantity.*, size.size_name, color.col_name, product.p_title, sales_items.quantity FROM sales_items JOIN size_color_quantity ON sales_items.size_color_quantity_id = size_color_quantity.size_color_quantity_id JOIN size ON size_color_quantity.size_id = size.size_id JOIN color ON size_color_quantity.color_code = color.col_code JOIN product ON size_color_quantity.product_id = product.p_id WHERE sales_items.sales_id = ?",
    [salesId]
  );
  // console.log("chuun");
  // console.log(salesItemRows);

  sales.items = salesItemRows.map((row) => {
    return {
      p_title: row.p_title,
      size_name: row.size_name,
      color_name: row.col_name,
      quantity: row.quantity,
      unit_price: row.unit_price,
      full_total_price: row.quantity * row.unit_price,
    };
  });
  // console.log(sales.items);

  sales.total_price = sales.items.reduce((total, item) => {
    return total + item.full_total_price;
  }, 0);
  // console.log("anthima");
  // console.log(sales);

  return sales;
}
// function pdfTemplate(sales) {
//   const { sales_id, user_id, full_total_price } = sales;

//   const tableBody = sales.items.map((item) => {
//     return [
//       { text: item.p_title, style: "tableHeader" },
//       { text: item.size_name, style: "tableHeader" },
//       { text: item.color_name, style: "tableHeader" },
//       { text: item.quantity, style: "tableHeader" },
//       { text: item.unit_price, style: "tableHeader" },
//       { text: item.total_price, style: "tableHeader" },
//     ];
//   });

//   return {
//     content: [
//       { text: "Sales Details", style: "header" },
//       { text: `Total Price: ${full_total_price}`, style: "subheader" },
//       {
//         table: {
//           widths: ["*", "*", "*", "*", "*", "*"],
//           body: [
//             [
//               { text: "Product", style: "tableHeader" },
//               { text: "Size", style: "tableHeader" },
//               { text: "Color", style: "tableHeader" },
//               { text: "Quantity", style: "tableHeader" },
//               { text: "Unit Price", style: "tableHeader" },
//               { text: "Total Price", style: "tableHeader" },
//             ],
//             ...tableBody,
//           ],
//         },
//       },
//     ],
//     styles: {
//       header: {
//         fontSize: 18,
//         bold: true,
//         margin: [0, 0, 0, 10],
//       },
//       subheader: {
//         fontSize: 14,
//         bold: true,
//         margin: [0, 10, 0, 5],
//       },
//       tableHeader: {
//         bold: true,
//         fontSize: 12,
//         color: "black",
//       },
//     },
//   };
// }

const getOrders = asyncHandler(async (req, res) => {
  
  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.execute("SELECT * FROM orders");

    const orders = rows;

    connection.release();
    res.status(200).json({ orders });
  } catch (error) {
    throw new Error(error);
  }
});



const getOrdersById = asyncHandler(async (req, res) => {
  const { id } = req.user;
  console.log(id);
  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.execute("SELECT * FROM orders WHERE user_id = ?",[id]);

    if(rows.length===0){
      connection.release();
      return res.status(200).json({ message: "No Orders Found" });
    }

    const orders = rows;

    connection.release();
    res.status(200).json({ orders });
  } catch (error) {
    throw new Error(error);
  }
});

const getOrderProducts = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  try {
    const connection = await pool.getConnection();

    const [orderItems] = await connection.execute(
      `SELECT oi.*, p.p_title, scq.unit_price 
      FROM order_items oi
       LEFT JOIN size_color_quantity scq ON oi.size_color_quantity_id = scq.size_color_quantity_id
       LEFT JOIN product p ON scq.product_id = p.p_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    console.log(orderItems);

    const orderItemsWithTotal = orderItems.map((item) => {
      const total = item.unit_price * item.quantity;
      return { ...item, total };
    });
    console.log(orderItemsWithTotal);

    connection.release();
    
    res.status(200).json([orderItemsWithTotal]);
  } catch (error) {
    throw new Error(error);
  }
});

const getOrderByUserId1234 = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const connection = await pool.getConnection();

    const [orders] = await connection.execute(
      `SELECT o.*, oi.size_color_quantity_id, oi.quantity, p.p_title, scq.unit_price
       FROM orders o
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       LEFT JOIN size_color_quantity scq ON oi.size_color_quantity_id = scq.size_color_quantity_id
       LEFT JOIN product p ON scq.product_id = p.p_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId]
    );

    const ordersWithTotals = orders.map((order) => {
      const orderItems = order.order_items.map((item) => {
        const total = item.unit_price * item.quantity;
        return { ...item, total };
      });

      const orderTotal = orderItems.reduce((acc, item) => acc + item.total, 0);

      return {
        ...order,
        order_items: orderItems,
        total: orderTotal,
        created_at: moment(order.created_at).format('MMMM Do YYYY, h:mm:ss a')
      };
    });

    connection.release();
    res.status(200).json(ordersWithTotals);
  } catch (error) {
    throw new Error(error);
  }
});



const getAOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log(id);

  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.execute(
      "SELECT * FROM orders WHERE order_id = ?",
      [id]
    );

    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({ message: "Order not found" });
    }

    const order = rows[0];

    connection.release();
    res.status(200).json({ order });
  } catch (error) {
    throw new Error(error);
  }
});




const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.execute(
      "UPDATE orders SET order_status = ? WHERE order_id = ?",
      [status, id]
    );

    if (rows.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ message: "Order not found" });
    }

    connection.release();
    res.status(200).json({ message: "Order status updated successfully" });
  } catch (error) {
    throw new Error(error);
  }
});

const updateRole = asyncHandler(async (req,res)=>{

  const {selectedRole, userId} = req.body;
  console.log(req.body);

  try {
    const connection = await pool.getConnection();

    const updateEnqSQL = 'UPDATE users SET role = ? WHERE id = ?';
    const [updateEnq] = await connection.execute(updateEnqSQL, [selectedRole, userId]);
    res.status(201).json(updateEnq);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
  finally{
    await connection.release()
  }
  })
  



module.exports = {
  createUser,
  loginUser,
  getallUser,
  getaUser,
  deleteaUser,
  updatedUser,
  blockUser,
  unblockUser,
  handleRefreshToken,
  logout,
  updatePassword,
  forgotPasswordToken,
  resetPassword,
  loginAdmin,
  getWishlist,
  saveAddress,
  userCart,
  getUserCart,
  removeFromCartItem,
  applyCoupon,
  createOrder,
  getOrders,
  updateOrderStatus,
  loginCashier,
  createOrderCashier,
  printBillCashier,
  getOrderProducts,
  getOrdersById,
  updateRole
};
