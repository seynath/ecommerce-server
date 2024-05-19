const mysql = require('mysql2');
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const {pool} = require('../config/db');
require("dotenv").config();



// const authMiddleware = asyncHandler(async (req, res, next) => {
//     const token = req.headers.authorization;
//     if (token && token.startsWith('Bearer')) {
//         try {
//             const decodedToken = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);

//             // Get a MySQL connection from the pool
//             const connection = await pool.getConnection();

//             // Execute a SELECT query to find the user with the decoded ID
//             console.log("Pakaya")
//             console.log(decodedToken.id)
//             const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [decodedToken.id]);
//             console.log("Pakaya2")
//             connection.release();

//             // Check if the user exists
//             if (rows.length === 0) {
//                 throw new Error('Not Authorized, User Not Found');
//             }

//             // Attach the user object to the request for further processing
//             req.user = rows[0];

//             next();
//         } catch (error) {
//             throw new Error('Not Authorized, Token Failed');
//         }
//     } else {
//         throw new Error('Not Authorized, No Token');
//     }
// });

// module.exports = authMiddleware;


const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization;
//   console.log(req.headers.authorization)
//   console.log('Token received:', token); // Log the token received in the headers
  if (token && token.startsWith('Bearer')) {
      try {
          // Split the token and extract the actual token value
          const tokenValue = token.split(' ')[1];
        //   console.log('Token value:', tokenValue); // Log the extracted token value

          // Verify and decode the token
          const decodedToken = jwt.verify(tokenValue, process.env.JWT_SECRET);
        //   console.log('Decoded token:', decodedToken); // Log the decoded token

          // Continue with the authentication process
          const connection = await pool.getConnection();

          const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [decodedToken.id]);


          connection.release();
          const user = rows[0];
          if (!user) {
              throw new Error('Not Authorized, Token Failed1');
          }
          req.user = user;

          next();
      } catch (error) {
        //   throw new Error('Not Authorized, Token Failed2');
          res.status(401).json(["Not Authorized, Token Failed'"]);
          throw new Error('Not Authorized, Token Failed');
      }
  } else {
      throw new Error('Not Authorized, No Token3');
  }
});


// const authMiddleware = asyncHandler(async (req, res, next) => {

//     const token = req.headers.authorization;
//     if (token && token.startsWith('Bearer')) {
//         try {
//             const decodedToken = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);

//             // const connection = await pool.getConnection();
//             const connection = await pool.getConnection();
//             const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [decodedToken.id]);
//             connection.release();
//             const user = rows[0];
//             if (!user) {
//                 throw new Error('Not Authorized, Token Failed');
//             }
//             req.user = user;
//             next();
//         } catch (error) {
//             throw new Error('Not Authorized, Token Failed');
//         }
//     } else {
//         throw new Error('Not Authorized, No Token');
//     }
// });

const isAdmin = asyncHandler(async (req, res, next) => {
    const { email } = req.user;
    try {
      
        const connection = await pool.getConnection();
        
        const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
        connection.release();
        const user = rows[0];
        if (!user || user.role !== 'admin') {
            throw new Error('Not Authorized, Admin Only');
        }
        next();
    } catch (error) {
        throw new Error('Not Authorized, Admin Only');
    }
});
const isCashier = asyncHandler(async (req, res, next) => {
    const { email } = req.user;
    try {
      
        const connection = await pool.getConnection();
        
        const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
        connection.release();
        const user = rows[0];
        if (!user || user.role !== 'cashier') {
            throw new Error('Not Authorized, Cahier Only');
        }
        next();
    } catch (error) {
        throw new Error('Not Authorized, Cashier Only');
    }
});

// const onlyAdmin = asyncHandler(async (req, res, next) => {
//     const {role} = req.body;
//     if(role !== 'admin'){
//         throw new Error('Not Authorized, Admin Only');
//     } else{
//         next();
//     }
// });

module.exports = { authMiddleware, isAdmin, isCashier};


// const User = require('../models/userModel');
// const asyncHandler = require('express-async-handler');
// const jwt = require('jsonwebtoken');

// const authMiddleware = asyncHandler(async (req, res, next) => {
//   const token = req.headers.authorization;
//   if (token && token.startsWith('Bearer')) {
//     try {
//       const decode = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
//       const user = await User.findById(decode.id).select('-password');
//       req.user = user;
//       next();
//     } catch (error) {
//       throw new Error('Not Authorized, Token Failed');
//     }
//   } else {
//     throw new Error('Not Authorized, No Token');
//   }
// });

// const isAdmin = asyncHandler(async (req, res, next) => {
//   const {email} = req.user;
//   const adminUser = await User.findOne({email:email});
//   if(adminUser.role !== 'admin'){
//     throw new Error('Not Authorized, Admin Only');
//   } else{
//     next();
//   }});

// module.exports = {authMiddleware, isAdmin};