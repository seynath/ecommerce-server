const asyncHandler = require("express-async-handler");
const { db } = require("../config/db");
const stripe = require("stripe")(
  "sk_test_51PNVJLFgaOcKIbptaY2it61TdwJYnwHBOS9r5fbIVZiHndhramlvbitSsnxd1RhXOYEt1XQHz4f6TTyNT7Mopksf00mcxqn389"
);
const stripeInstance = require("stripe")(
  "sk_test_51PNVJLFgaOcKIbptaY2it61TdwJYnwHBOS9r5fbIVZiHndhramlvbitSsnxd1RhXOYEt1XQHz4f6TTyNT7Mopksf00mcxqn389"
);
const sendEmail = require("../controllers/emailCtrl");

const createOrder = asyncHandler(async (req, res) => {
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
  console.log({id:id});

  try {
    const order_rows = await new Promise((resolve, rejects) => {
      db.query(
        "INSERT INTO orders (first_name, last_name, user_id, payment_method, email, mobile, order_status, message, shipping_apt_no, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_country, billing_apt_no, billing_address, billing_city, billing_state, billing_zip, billing_country, total_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          firstName,
          lastName,
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
        ],
        (err, results) => {
          console.log("Error in code");
          console.log(err);
          console.log("result in code");
          console.log(results);
          if (err) {
            rejects(err);
          }
          resolve(results);
        }
      );
    });
    console.log({order_rows:order_rows});

    const rows = await new Promise((resolve, rejects) => {
      db.query("SELECT * FROM cart WHERE user_id = ?", [id], (err, results) => {
        if (err) {
          rejects(err);
        }
        resolve(results);
      });
    });

    console.log({rows:rows});

    if (rows.length === 0) {
      return res.status(404).json({ message: "No Cart Found" });
    }
    const cart_id = rows[0].cart_id;

    const rows1 = await new Promise((resolve, rejects) => {
      db.query(
        "SELECT * FROM cart_items WHERE cart_id = ?",
        [cart_id],
        (err, results) => {
          if (err) {
            rejects(err);
          }
          resolve(results);
        }
      );
    });

    console.log(rows1);

    // wada
    if (rows1.length === 0) {
      return res.status(404).json({ message: "No Cart Items Found" });
    }

    for (let item of rows1) {
      const rows2 = await new Promise((resolve, rejects) => {
        db.query(
          "SELECT * FROM size_color_quantity WHERE size_color_quantity_id = ?",
          [item.size_color_quantity_id],
          (err, results) => {
            if (err) {
              rejects(err);
            }
            resolve(results);
          }
        );
      });

      let availableQuantity = rows2[0].quantity;
      let product_id = rows2[0].product_id;

      if (availableQuantity < item.quantity) {
        return res
          .status(400)
          .json({ message: "Not enough quantity available" });
      }

      await new Promise((resolve, rejects) => {
        db.query(
          "UPDATE product SET sold = sold + ? WHERE p_id = ?",
          [item.quantity, product_id],
          (err, result) => {
            console.log("Error in code");
            console.log(err);
            console.log("result in code");
            console.log(result);
            if (err) {
              rejects(err);
            }
            resolve(result);
          }
        );
      });

      let newavailableQuantity = availableQuantity - item.quantity;

      const rows3 = await new Promise((resolve, rejects) => {
        db.query(
          "UPDATE size_color_quantity SET quantity = ? WHERE size_color_quantity_id = ?",
          [newavailableQuantity, item.size_color_quantity_id],
          (err, results) => {
            if (err) {
              rejects(err);
            }
            resolve(results);
          }
        );
      });

      // remove item from cart item table

      const rows4 = await new Promise((resolve, rejects) => {
        db.query(
          "DELETE FROM cart_items WHERE cart_item_id = ?",
          [item.cart_item_id],
          (err, results) => {
            if (err) {
              rejects(err);
            }
            resolve(results);
          }
        );
      });


      // add product to the orders_items table

      const rows5 = await new Promise((resolve, rejects) => {
        db.query(
          "INSERT INTO order_items (order_id, size_color_quantity_id, quantity) VALUES (?,?,?)",
          [order_rows.insertId, item.size_color_quantity_id, item.quantity],
          (err, results) => {
            if (err) {
              rejects(err);
            }
            resolve(results);
          }
        );
      });

      // update quantity in other customers' carts

      const rows6 = await new Promise((resolve, rejects) => {
        db.query(
          "UPDATE cart_items SET quantity = LEAST(quantity, ?) WHERE size_color_quantity_id = ?",
          [newavailableQuantity, item.size_color_quantity_id],
          (err, results) => {
            if (err) {
              rejects(err);
            }
            resolve(results);
          }
        );
      });
      console.log({ rows6: rows6 });
    }

    // await Promise.all(promises);

    console.log("begin mail");
    const bodyMessage = `Thank You for Purchased from Nisha Fashion Store. To see the order confirmation details visit this link. <a href='http://localhost:3001/order'>See Orser Details</>`;
    const data = {
      to: email,
      text: `Hi ${firstName} ${lastName}, Order is successful `,
      subject: "Order Confirmation",
      htm: bodyMessage,
    };
    sendEmail(data);
    
    console.log("end mail");


    res.status(201).json({ message: "Order created successfully" });
  } catch (error) {
    // res.status(404).json(error)
    throw new Error(error);
  }
});

//create order fuction use stripe

const createOrderByCard = asyncHandler(async (req, res) => {
  console.log(req.body);
  const { cart } = req.body;
  console.log(cart);
  try {
    const line_items = cart.map((cartItem, index) => {
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: cartItem.productDetails.p_title,
            images: [cartItem.productDetails.image_link],
            description: `Size: ${cartItem.productDetails.size_name}, Color: ${cartItem.productDetails.col_name}`,
          },
          unit_amount: cartItem.productDetails.unit_price * 100,
        },
        quantity: cartItem.quantity,
      };
    });
    console.log(line_items);
    // res.json(200)

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: "http://localhost:3001/success",
      cancel_url: "http://localhost:3001/cancel",
    });

    res.send({ id: session.id, url: session.url });
  } catch (error) {
    res.status(400).json({ message: "Error in payment" });
  }
});

const loadSessionId = async (req, res) => {
  console.log(req.params.sessionId);
  try {
    const session = await stripeInstance.checkout.sessions.retrieve(
      req.params.sessionId
    );
    console.log(session);
    res.json({ payment_status: session.payment_status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createOrder,
  createOrderByCard,
  loadSessionId,
};
