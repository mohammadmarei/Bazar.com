// Order service
// handles purchase requests: asks the catalog if the book is in stock, then takes one copy

const express = require('express');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(express.json());

const PORT = 3000;
const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:4000';
const FILE = __dirname + '/orders.json';

// load the old orders from the file (if there are any)
let orders = [];
if (fs.existsSync(FILE)) {
    const data = fs.readFileSync(FILE, 'utf8');
    if (data.trim() != '') orders = JSON.parse(data);
}

function saveOrder(bookId, book, status) {
    orders.push({
        id: orders.length + 1,
        bookId: parseInt(bookId),
        title: book.title,
        price: book.price,
        status: status,
        date: new Date().toISOString()
    });
    fs.writeFileSync(FILE, JSON.stringify(orders, null, 2));
}

app.post('/purchase/:id', async (req, res) => {
    const id = req.params.id;
    let book;

    try {
        // first ask the catalog about the book
        const info = await axios.get(CATALOG_URL + '/info/' + id);
        book = info.data;

        if (book.quantity <= 0) {
            console.log('out of stock: ' + book.title);
            saveOrder(id, book, 'failed');
            return res.status(400).json({ message: book.title + ' is out of stock' });
        }

        // the book is available, so decrease the stock by 1
        const update = await axios.put(CATALOG_URL + '/update/' + id, { change: -1 });

        saveOrder(id, book, 'success');
        console.log('bought book ' + book.title);
        res.json({
            message: 'bought book ' + book.title,
            title: book.title,
            price: book.price,
            left: update.data.quantity
        });
    } catch (err) {
        if (err.response && err.response.status == 404) {
            console.log('book ' + id + ' not found');
            return res.status(404).json({ message: 'Book not found' });
        }
        // 409 = another order took the last copy between our two requests
        if (err.response && err.response.status == 409) {
            console.log('out of stock: ' + book.title);
            saveOrder(id, book, 'failed');
            return res.status(400).json({ message: book.title + ' is out of stock' });
        }
        console.log('error: ' + err.message);
        res.status(500).json({ message: 'Could not reach the catalog service' });
    }
});

app.listen(PORT, () => {
    console.log('Order server is running on port ' + PORT);
});
