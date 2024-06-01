const asyncHandler = require("express-async-handler");
const { db } = require("../config/db");

// const salesReport = asyncHandler(async (req, res) => {
//   try {
//     const { fromDate, toDate } = req.query;

//     // Query for sales within the given date range
  
//     const sales = await new Promise(
//       (resolve, reject) => {
//         db.query(
//           `
//           SELECT
//           s.sales_id,
//           s.date_time,
//           SUM(si.quantity * scq.unit_price) as total,
//           JSON_OBJECTAGG(
//             CONCAT(scq.size_id, '_', scq.color_code),
//             JSON_OBJECT(
//               'product_id', p.p_id,
//               'size_name', sz.size_name,
//               'color_name', cl.col_name,
//               'quantity', si.quantity,
//               'unit_price', scq.unit_price,
//               'product_title', p.p_title,
//               'product_slug', p.p_slug,
//               'product_description', p.p_description,
//               'brand', p.brand
//             )
//           ) as items
//         FROM sales s
//         JOIN sales_items si ON s.sales_id = si.sales_id
//         JOIN size_color_quantity scq ON si.size_color_quantity_id = scq.size_color_quantity_id
//         JOIN size sz ON scq.size_id = sz.size_id
//         JOIN color cl ON scq.color_code = cl.col_code
//         JOIN product p ON scq.product_id = p.p_id
//         WHERE s.date_time BETWEEN ? AND ?
//         GROUP BY s.sales_id, s.date_time
//           `,
//           [fromDate, toDate],
//           (err, result) => {
//             if (err) {
//               reject(err);
//             } else {
//               resolve(result);
//             }
//           }
//         );
//       }
//     );
    



//     res.status(200).json(sales);
//   } catch (err) {
//     console.error(err);
//     res
//       .status(500)
//       .json({ error: "An error occurred while generating the report" });
//   }
// });

const salesReport = asyncHandler(async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    // Query for sales within the given date range
    const sales = await new Promise((resolve, reject) => {
      db.query(
        `
        SELECT
          s.sales_id,
          s.date_time,
          SUM(si.quantity * scq.unit_price) as total,
          JSON_OBJECTAGG(
            CONCAT(scq.size_id, '_', scq.color_code),
            JSON_OBJECT(
              'product_id', p.p_id,
              'size_name', sz.size_name,
              'color_name', cl.col_code,
              'quantity', si.quantity,
              'unit_price', scq.unit_price,
              'product_title', p.p_title,
              'product_slug', p.p_slug,
              'product_description', p.p_description,
              'brand', p.brand
            )
          ) as items,
          'offline' as order_source
        FROM sales s
        JOIN sales_items si ON s.sales_id = si.sales_id
        JOIN size_color_quantity scq ON si.size_color_quantity_id = scq.size_color_quantity_id
        JOIN size sz ON scq.size_id = sz.size_id
        JOIN color cl ON scq.color_code = cl.col_code
        JOIN product p ON scq.product_id = p.p_id
        WHERE s.date_time BETWEEN ? AND ?
        GROUP BY s.sales_id, s.date_time

        UNION ALL

        SELECT
          o.order_id,
          o.date_time,
          SUM(oi.quantity * scq.unit_price) as total,
          JSON_OBJECTAGG(
            CONCAT(scq.size_id, '_', scq.color_code),
            JSON_OBJECT(
              'product_id', p.p_id,
              'size_name', sz.size_name,
              'color_name', cl.col_code,
              'quantity', oi.quantity,
              'unit_price', scq.unit_price,
              'product_title', p.p_title,
              'product_slug', p.p_slug,
              'product_description', p.p_description,
              'brand', p.brand
            )
          ) as items,
          'online' as order_source
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN size_color_quantity scq ON oi.size_color_quantity_id = scq.size_color_quantity_id
        JOIN size sz ON scq.size_id = sz.size_id
        JOIN color cl ON scq.color_code = cl.col_code
        JOIN product p ON scq.product_id = p.p_id
        WHERE o.date_time BETWEEN ? AND ? AND o.payment_method = 'Cash'
        GROUP BY o.order_id, o.date_time
        `,
        [fromDate, toDate, fromDate, toDate],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });

    res.status(200).json(sales);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while generating the report" });
  }
});


const inventoryReport = asyncHandler( async (req, res) => {
  try {
    // Query for inventory data

    const inventory = await new Promise(
      (resolve, reject) => {
        db.query(
          `
          SELECT
          scq.size_color_quantity_id,
          p.p_id,
          p.p_title,
          p.p_slug,
          p.p_description,
          p.brand,
          sz.size_name,
          cl.col_name,
          scq.quantity,
          scq.unit_price,
          scq.buying_price
        FROM size_color_quantity scq
        JOIN product p ON scq.product_id = p.p_id
        JOIN size sz ON scq.size_id = sz.size_id
        JOIN color cl ON scq.color_code = cl.col_code
          `,
          (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          }
        );
      }
    );
    
    // const inventory = await db.query(
    //   `
    //   SELECT
    //     scq.size_color_quantity_id,
    //     p.p_id,
    //     p.p_title,
    //     p.p_slug,
    //     p.p_description,
    //     p.brand,
    //     sz.size_name,
    //     cl.col_name,
    //     scq.quantity,
    //     scq.unit_price,
    //     scq.buying_price
    //   FROM size_color_quantity scq
    //   JOIN product p ON scq.product_id = p.p_id
    //   JOIN size sz ON scq.size_id = sz.size_id
    //   JOIN color cl ON scq.color_code = cl.col_code
    //   `
    // );

    res.json(inventory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while generating the report' });
  }
})


module.exports = { salesReport ,
  inventoryReport
};
