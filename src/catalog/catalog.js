// Catalog service
// keeps the books in catalog.json and handles the query and update requests

const express = require('express');
const fs = require('fs');

const app = express();
app.use(express.json());

const PORT = 4000;
const FILE = __dirname + '/catalog.json';

// read the books from the file when the server starts
let books = JSON.parse(fs.readFileSync(FILE, 'utf8'));

function saveBooks() {
    fs.writeFileSync(FILE, JSON.stringify(books, null, 2));
}

// query by topic
app.get('/search/:topic', (req, res) => {
    const topic = req.params.topic.toLowerCase();
    const result = books
        .filter(b => b.topic.toLowerCase() == topic)
        .map(b => ({ id: b.id, title: b.title }));

    console.log('search "' + req.params.topic + '":', result);
    res.json(result);
});

// query by item
app.get('/info/:id', (req, res) => {
    const book = books.find(b => b.id == req.params.id);
    if (!book) {
        console.log('info: book ' + req.params.id + ' not found');
        return res.status(404).json({ message: 'Book not found' });
    }

    console.log('info:', book);
    res.json({ title: book.title, quantity: book.quantity, price: book.price });
});

// update a book
// the body can have price (new price), quantity (new stock)
// or change (add/remove from the stock, the order service sends -1)
app.put('/update/:id', (req, res) => {
    const book = books.find(b => b.id == req.params.id);
    if (!book) {
        return res.status(404).json({ message: 'Book not found' });
    }

    const { price, quantity, change } = req.body || {};
    let newQuantity = book.quantity;
    if (quantity != undefined) newQuantity = Number(quantity);
    if (change != undefined) newQuantity += Number(change);

    if (isNaN(newQuantity) || (price != undefined && isNaN(price))) {
        return res.status(400).json({ message: 'Wrong values' });
    }

    // the check and the update happen in the same request,
    // so two orders at the same time can't both take the last copy
    if (newQuantity < 0) {
        console.log('update: not enough stock for ' + book.title);
        return res.status(409).json({ message: 'Not enough stock' });
    }

    book.quantity = newQuantity;
    if (price != undefined) book.price = Number(price);
    saveBooks();

    console.log('updated:', book);
    res.json(book);
});

app.listen(PORT, () => {
    console.log('Catalog server is running on port ' + PORT);
});
