# Bazar.com

Lab 1 for Distributed and Operating Systems, Fall 2026.

Bazar.com is a small online book store with four books, built from three microservices.
The services talk to each other with HTTP REST calls, and each one runs in its own Docker
container.

Team: Ameen Salahaldeen, Mohammad Marei

## Architecture

```
client (host) ---> frontend :5000 ---> catalog :4000   (search, info)
                        |
                        +------> order :3000 ---> catalog :4000   (info, then update)
```

| Service  | Folder            | Port | What it does                                              |
|----------|-------------------|------|-----------------------------------------------------------|
| frontend | `src/front-end/`  | 5000 | Receives the client's requests and forwards them          |
| catalog  | `src/catalog/`    | 4000 | Keeps the books, their stock and price in `catalog.json`  |
| order    | `src/order/`      | 3000 | Handles purchases and keeps the orders in `orders.json`   |

All services are written in Node.js with Express.

## REST API

| Service  | Request                | Reply                                                     |
|----------|------------------------|-----------------------------------------------------------|
| frontend | `GET /search/:topic`   | List of `{ id, title }` for the books in this topic      |
| frontend | `GET /info/:id`        | `{ title, quantity, price }`                              |
| frontend | `POST /purchase/:id`   | `{ message: "bought book ...", title, price, left }`      |
| catalog  | `GET /search/:topic`   | Same as the frontend                                      |
| catalog  | `GET /info/:id`        | Same as the frontend, or 404                              |
| catalog  | `PUT /update/:id`      | Body: `price`, `quantity` or `change`. 409 if the stock would go below 0 |
| order    | `POST /purchase/:id`   | Buys one copy, or fails if the book is out of stock       |

The two topics are `distributed systems` and `undergraduate school`.

## How to run

You need Docker Desktop and Node.js 18 or newer.

1. Start the three services:
   ```
   docker compose up --build
   ```
2. In another terminal, run the client from the project folder:
   ```
   node client/client.js search "distributed systems"
   node client/client.js info 2
   node client/client.js purchase 2
   node client/client.js update 2 price 55
   node client/client.js test 4 5
   node client/client.js demo
   ```
   `test 4 5` sends 5 purchases for book 4 at the same time. `demo` runs all the commands
   one after the other.
3. Stop the services with Ctrl+C or `docker compose down`.

The stock and the orders are saved in `src/catalog/catalog.json` and `src/order/orders.json`,
so they stay after a restart. To go back to the original data, run
`git restore src/catalog/catalog.json src/order/orders.json` while the services are stopped.

If port 3000, 4000 or 5000 is already used on your machine, change the first number of that
port in `docker-compose.yml` (for example `"3001:3000"`).

## Documents

- [docs/design.md](docs/design.md): the design, how it works, tradeoffs, known problems and
  possible improvements
- [docs/output.txt](docs/output.txt): output of `node client/client.js demo` and the logs
  of the three services

## Project structure

```
client/client.js          command line client
docker-compose.yml        runs the three containers
docs/                     design document and sample output
src/catalog/              catalog service
src/order/                order service
src/front-end/            frontend service
```
