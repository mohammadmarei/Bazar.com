# Bazar.com - Lab 1 Design Document

Distributed and Operating Systems, Fall 2026

Team: Ameen Salahaldeen, Mohammad Marei

## 1. Overview

In this lab we built Bazar.com, a small online book store that sells only four books.
We split the system into three microservices:

- **frontend**: the client only talks to this service
- **catalog**: keeps the books, their stock and their price
- **order**: handles buying a book

Each service is a separate Node.js program written with Express, and each one runs in its
own Docker container. The services talk to each other with HTTP REST calls and all the
replies are JSON.

```
client ---> frontend ---> catalog   (search, info)
               |
               +-------> order ---> catalog   (info, then update)
```

We wrote all the services in JavaScript (Node.js), as required in our course, and used
Express because it is a small micro framework like Flask, so each service is one short file.

## 2. The services

### Catalog (src/catalog/catalog.js)

The catalog keeps the four books in `catalog.json`. For every book we save the id, title,
topic, quantity and price. The server reads the file when it starts, and after every update
it writes the file again, so nothing is lost when we restart it.

It has three endpoints:

- `GET /search/:topic` returns the id and title of every book in this topic. The topic is
  not case sensitive, and if nothing matches it returns an empty list.
- `GET /info/:id` returns the title, quantity and price of one book, or 404 if the id
  doesn't exist.
- `PUT /update/:id` changes a book. The body can have `price` (the new price), `quantity`
  (the new stock) or `change` (a number to add to the stock, for example -1). If the new
  stock would be less than 0 it returns 409 and doesn't change anything.

### Order (src/order/order.js)

The order service has one endpoint, `POST /purchase/:id`. When a purchase comes:

1. It asks the catalog for the book info (`GET /info/:id`).
2. If the quantity is 0, the purchase fails and we return "out of stock".
3. If there is stock, it sends `PUT /update/:id` with `{"change": -1}` to the catalog.
4. It saves the order in `orders.json` and prints `bought book <title>`.

We save the failed orders too (with status "failed"), so `orders.json` has every purchase
request and not only the successful ones.

### Frontend (src/front-end/frontend.js)

The frontend has the three operations from the lab: `search(topic)`, `info(item_number)`
and `purchase(item_number)`. Search and info go to the catalog and purchase goes to the
order service. The frontend doesn't change the data, it sends the request and returns the
same reply (with the same status code) to the client. If a service doesn't answer, it
returns 503.

### Client (client/client.js)

We wrote a small command line client that runs on the host. It sends the requests to the
frontend and prints the results in a readable way: the list of books for search, the title,
stock and price for info, and "bought book ..." for purchase. We also added:

- `update`: talks to the catalog directly, we use it to add new stock or change a price
- `test`: sends many purchases for the same book at the same time
- `demo`: runs all the commands one after the other (`docs/output.txt` is from this)

## 3. How a purchase works

For example, when we run `node client/client.js purchase 2`:

1. The client sends `POST localhost:5000/purchase/2` to the frontend.
2. The frontend sends `POST order:3000/purchase/2` to the order service.
3. The order service calls `GET catalog:4000/info/2` and gets the quantity (5).
4. Since 5 > 0, it calls `PUT catalog:4000/update/2` with `{"change": -1}`. The catalog
   makes the quantity 4 and saves the file.
5. The order service saves the order and replies with "bought book RPCs for Noobs" and how
   many copies are left.
6. The frontend sends this back to the client and the client prints it.

## 4. Design decisions and tradeoffs

**REST between all the services.** Even the order service talks to the catalog over HTTP,
it never reads `catalog.json` itself. This way every service only touches its own data, and
we can move any service to another machine. The addresses of the other services are in
environment variables (`CATALOG_URL` and `ORDER_URL`), and in `docker-compose.yml` we set
them to the container names.

**JSON files instead of a database.** The lab allows text files or sqlite, and for four
books a JSON file is enough and easy to read. The downside is that we rewrite the whole file
on every change, which would be slow with a lot of books.

**Concurrency.** Express can handle many requests at the same time. The case we had to
think about is two people buying the last copy at the same moment: both could see
quantity = 1 and both buy it. To avoid this, the order service doesn't send the new quantity
to the catalog, it sends `change: -1`. The catalog does the check and the update together in
the same handler, and since there is no `await` between them, Node can't run another request
in the middle. If the stock would go below 0, the catalog returns 409 and the purchase fails.
We tested this with the `test` command: 5 purchases at the same time for a book with 3 copies
gave 3 successes and 2 "out of stock".

The order service still checks the stock before the update because the lab asks for it,
even though the check in the catalog would be enough on its own.

We used `writeFileSync` to save the files. It blocks the server for a very short time on
each write, but it is simpler and two writes can't get mixed together.

## 5. Known problems

- Buying is not atomic between the two services. If the order service crashes after the
  catalog decreased the stock but before the order is saved, we lose one copy without an
  order record.
- If the catalog is down, search, info and purchase all fail. We don't have replicas or
  retries.
- We can't run two copies of the same service on the same data file, they would overwrite
  each other.
- There is no login, so anyone who can reach port 4000 can change the stock or the price.
- If the id is not a number (like `/purchase/abc`) it just returns "Book not found".

## 6. Possible improvements

- **Cache in the frontend**: keep the results of search and info in memory so we don't ask
  the catalog every time. When a book changes, the catalog would tell the frontend to remove
  it from the cache.
- **Replication**: run more than one catalog and order service, and let the frontend send
  the requests to them in turn (round robin). The replicas would have to send their updates
  to each other so they stay the same.
- **SQLite** instead of JSON files, so we get transactions and don't rewrite the whole file.
- **Safer purchase**: send an order id with the update, so if the same purchase is sent twice
  it only counts once.
- **Automatic restock**: a small job that calls update with a positive `change` every few
  minutes.

## 7. How to run

1. Install Docker Desktop and Node.js (version 18 or newer).
2. In the project folder run `docker compose up --build`. This starts 3 containers: catalog
   on port 4000, order on port 3000 and frontend on port 5000.
3. Open another terminal in the same folder and run the client, for example:
   - `node client/client.js search "distributed systems"`
   - `node client/client.js info 2`
   - `node client/client.js purchase 2`
   - `node client/client.js demo`
4. The logs of each service show in the docker compose terminal, and the client prints the
   results in its own terminal.
5. To stop it press Ctrl+C or run `docker compose down`. The stock and the orders stay saved
   in `src/catalog/catalog.json` and `src/order/orders.json`.
