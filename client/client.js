// Command line client for Bazar.com (needs node 18 or newer, no npm install)
//
// how to use:
//   node client/client.js search "distributed systems"
//   node client/client.js info 2
//   node client/client.js purchase 2
//   node client/client.js update 2 price 55      (or: quantity 10, change 5)
//   node client/client.js test 4 5               (5 purchases of book 4 at the same time)
//   node client/client.js demo                   (runs all of the above)

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5000';
const CATALOG = process.env.CATALOG_URL || 'http://localhost:4000';

async function search(topic) {
    const res = await fetch(FRONTEND + '/search/' + encodeURIComponent(topic));
    const books = await res.json();

    console.log('\nBooks about "' + topic + '":');
    if (!res.ok) return console.log('  error: ' + books.message);
    if (books.length == 0) return console.log('  nothing found');
    books.forEach(b => console.log('  ' + b.id + '. ' + b.title));
}

async function info(id) {
    const res = await fetch(FRONTEND + '/info/' + id);
    const book = await res.json();

    console.log('\nBook #' + id + ':');
    if (!res.ok) return console.log('  error: ' + book.message);
    console.log('  title:    ' + book.title);
    console.log('  in stock: ' + book.quantity);
    console.log('  price:    $' + book.price);
}

async function purchase(id) {
    const res = await fetch(FRONTEND + '/purchase/' + id, { method: 'POST' });
    const data = await res.json();

    if (res.ok) console.log('bought book ' + data.title + ' (' + data.left + ' left)');
    else console.log('purchase failed: ' + data.message);
    return res.ok;
}

// this one talks to the catalog directly, it's for new stock or a new price
async function update(id, field, value) {
    const res = await fetch(CATALOG + '/update/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: Number(value) })
    });
    const book = await res.json();

    console.log('\nUpdate book #' + id + ' (' + field + ' ' + value + '):');
    if (!res.ok) return console.log('  error: ' + book.message);
    console.log('  ' + book.title + ' -> quantity: ' + book.quantity + ', price: $' + book.price);
}

// send many purchases at once to make sure we never sell more than we have
async function test(id, count) {
    console.log('\nSending ' + count + ' purchases for book #' + id + ' at the same time...');
    const requests = [];
    for (let i = 0; i < count; i++) {
        requests.push(purchase(id));
    }
    const results = await Promise.all(requests);
    const ok = results.filter(r => r).length;
    console.log('done: ' + ok + ' bought, ' + (count - ok) + ' failed');
}

async function demo() {
    await search('distributed systems');
    await search('undergraduate school');
    await info(2);
    console.log('\nBuying book #2...');
    await purchase(2);
    await info(2);
    await update(4, 'quantity', 3);
    await test(4, 5);
    await info(4);
    await update(4, 'change', 10);
    await update(4, 'price', 20);
    console.log('\nSome wrong requests:');
    await info(99);
    await purchase(99);
    await search('cooking');
}

async function main() {
    const args = process.argv.slice(2);
    const cmd = args[0];

    if (cmd == 'search') await search(args.slice(1).join(' '));
    else if (cmd == 'info') await info(args[1]);
    else if (cmd == 'purchase') await purchase(args[1]);
    else if (cmd == 'update') await update(args[1], args[2], args[3]);
    else if (cmd == 'test') await test(args[1], Number(args[2] || 5));
    else if (cmd == 'demo') await demo();
    else console.log('commands: search <topic> | info <id> | purchase <id> | update <id> <price|quantity|change> <value> | test <id> <count> | demo');
}

main().catch(err => {
    console.log('Could not connect to the server, did you run docker compose up?');
});
