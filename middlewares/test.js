const options = await new Promise((resolve, reject) => {
  db.query('SELECT DISTINCT i.itemName FROM Item i JOIN Stock s ON i.itemId = s.itemId', (error, results) => {
      if (error) {
          reject(error);
      } else {
          resolve(results);
      }
  });
});



export const savePicOrders = async (req, res) => {
    const { temporderId, name, contact, quantity, formattedDate, cakeText, pickupDate, imgLink, branchId } = req.body;
    const orderId = await generateNewOrderId();
    const status = 'Pending';
    const date = new Date(pickupDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedPickupDate = `${year}-${month}-${day}`;
    console.log(orderId);
    console.log(req.body);

    if (!orderId || !name || !contact || !quantity || !formattedDate || !cakeText || !pickupDate || !imgLink || !branchId) {
        return res.status(400).json({ error: 'ItemId, Quantity, and ExpiryDate are required' });
    }

    try {
        db.beginTransaction(async function (err) {
            if (err) {
                throw err;
            }

            const InsertResult = await new Promise((resolve, reject) => {
                db.query('INSERT INTO picUploadingOrders (picOrderId, name, contact, quantity, orderDate, cakeText, pickupDate, imgLink, branchId, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [orderId, name, contact, quantity, formattedDate, cakeText, formattedPickupDate, imgLink, branchId, status], (error, result) => {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
            });

            if (InsertResult.affectedRows >= 1) {
                // If insertion into picUploadingOrders is successful, delete the record from tempOrders
                db.query('DELETE FROM tempOrders WHERE temporderId = ?', [temporderId], function (error, result) {
                    if (error) {
                        return db.rollback(function () {
                            console.error('Error deleting from tempOrders:', error);
                            return res.status(500).json({ error: 'Failed to delete from tempOrders' });
                        });
                    }
                    db.commit(function (err) {
                        if (err) {
                            return db.rollback(function () {
                                console.error('Error committing transaction:', err);
                                return res.status(500).json({ error: 'Transaction failed' });
                            });
                        }
                        console.log('Transaction Complete.');
                        return res.status(200).json({ message: 'Stock details updated successfully' });
                    });
                });
            } else {
                return res.status(500).json({ error: 'Failed to update stock details' });
            }
        });
    } catch (error) {
        console.log('Error saving stock details:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};