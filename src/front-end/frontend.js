// Frontend service
// the client sends everything here and we pass it to the catalog or the order service

const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = 5000;
const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:4000';
const ORDER_URL = process.env.ORDER_URL || 'http://localhost:3000';

// search(topic) -> catalog
app.get('/search/:topic', async (req, res) => {
    console.log('search request: ' + req.params.topic);
    try {
        const response = await axios.get(CATALOG_URL + '/search/' + encodeURIComponent(req.params.topic));
        console.log('found ' + response.data.length + ' books');
        res.json(response.data);
    } catch (err) {
        sendError(res, err);
    }
});

// info(item_number) -> catalog
app.get('/info/:id', async (req, res) => {
    console.log('info request: ' + req.params.id);
    try {
        const response = await axios.get(CATALOG_URL + '/info/' + req.params.id);
        console.log(response.data);
        res.json(response.data);
    } catch (err) {
        sendError(res, err);
    }
});

// purchase(item_number) -> order
app.post('/purchase/:id', async (req, res) => {
    console.log('purchase request: ' + req.params.id);
    try {
        const response = await axios.post(ORDER_URL + '/purchase/' + req.params.id);
        console.log(response.data.message);
        res.json(response.data);
    } catch (err) {
        sendError(res, err);
    }
});

// if the other service sent back an error we send the same error to the client,
// if it didn't answer at all then it's probably down
function sendError(res, err) {
    if (err.response) {
        console.log('error ' + err.response.status + ': ' + err.response.data.message);
        res.status(err.response.status).json(err.response.data);
    } else {
        console.log('service not responding: ' + err.message);
        res.status(503).json({ message: 'Service not available' });
    }
}

app.listen(PORT, () => {
    console.log('Frontend server is running on port ' + PORT);
});
