
# Trading Platform API

## Project Overview 

The Trading Platform API is a RESTful service designed for buyers and sellers to engage in deal-based transactions. 
The system enables **sellers** to post and update deals, while **buyers** can view deals they are authorized to 
and receive notifications for updates, such as **price changes** or **status updates** (available or sold).

This API extends the initial requirements by implementing several advanced features:
- **Role-Based Access Control** for **buyers** and **sellers** using JWT authentication.
- **Webhook notifications** using **Bull/Redis** to ensure reliable delivery of updates.
- **Rate-limiting middleware** to manage API request traffic and ensure scalability.
- An **extended schema** to accommodate future features like bidding and invoicing.

This system is designed with scalability(system and team), resilience, and robustness in mind to handle growing buyer-seller interactions.

Technologies
- **TypeScript**: Backend development language.
- **Fastify**: A lightweight, high-performance web framework.
- **Prisma**: ORM for PostgreSQL interactions.
- **Bull & Redis**: Used for job processing and webhook delivery.
- **Jest**: For unit and integration testing.
- **Swagger**: For API documentation.

Key Features

1. **Sellers**:
    - Create, update, and manage deals with detailed information.
    - Send new deal notifications to authorized buyers.
    - Manage buyer access to private deals.

2. **Buyers**:
    - View public and authorized private deals.
    - Request access to specific sellers’ private deals.
    - Set up webhooks to receive updates from sellers they follow.

3. **Authentication**:
    - JWT-based authentication for both buyers and sellers.
    - Role-based access control using **roles** (BUYER, SELLER).

4. **Webhook Notifications**:
    - Implemented using Bull/Redis for processing and sending deal notifications.
    - Retry logic ensures reliable delivery of notifications to buyers.

5. **Rate Limiting**:
    - Redis-based rate-limiting middleware added to ensure scalability and prevent API abuse.

Installation

1. Navigate to the project directory
```bash

cd trading-platform-api
```

2. Install Dependencies
```bash
npm install
```

3. Configure Environment Variables
Create a `.env` file in the root directory with the following:
```
DATABASE_URL=postgresql://user:password@localhost:5432/trading_db
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=3600
APP_PORT=3000
CORS_ENABLED=true
CORS_ORIGIN=*
LOG_LEVEL=info
API_VERSION=v1
NODE_ENV=development
PRISMA_LOGGING=true
COOKIE_SECRET=your_cookie_secret_key
```

4. Run Database Migrations
```bash
npx prisma migrate dev --name init
```

5. Start the Application
```bash
npm run start:dev
```

Available API Endpoints

1. **Authentication**
- **POST /auth/register**: Register as a buyer or seller (role selection upon registration).
- **POST /auth/login**: Login and obtain a JWT token.
- **GET /auth/profile**: Retrieve the authenticated user's profile.

1. **Buyer Routes**
- **GET /buyers/authorized-deals**: View all authorized and public deals.
- **GET /buyers/authorized-deals/private**: View only authorized private deals.
- **POST /buyers/webhook**: Set or update the buyer’s webhook URL.
- **POST /buyers/:buyerId/sellers/:sellerId/request-access**: Request access to a seller's private deals.

1. **Seller Routes**
- **POST /sellers/deals**: Create a new deal.
- **PUT /sellers/deals/:dealId**: Update an existing deal.
- **PATCH /sellers/requests/:buyerId/approve**: Approve or reject a buyer's request for access.
- **DELETE /sellers/authorized-buyers/:buyerId**: Revoke a buyer's authorization to access the seller's deals.

Extended Features

1. **Rate Limiting**:
    - Implemented Redis-based rate limiting middleware to manage API request traffic, ensuring system scalability under load.

2. **Webhook Retry Mechanism**:
    - Bull/Redis is used to queue and retry webhook deliveries in case of failure, ensuring reliable update notifications to buyers.

3. **Error Handling**:
    - A global exception filter provides consistent error responses, improving the API's resilience and making debugging easier.

Testing

Run unit with **Jest**:
```bash
npm run test
```

Running the API with Docker

You can run the application using Docker:

1. Build the Docker Image:
```bash
docker-compose build
```

1. Start the Containers:
```bash
docker-compose up
```

Future Enhancements

1. **Bid and Invoice System**:
    - Add the ability for buyers to place bids on deals, with invoices automatically generated upon deal closure.

2. **Scalability and Resilience**:
    - Introduce horizontal scaling to handle larger volumes of buyers and sellers while maintaining low latency.
    - Enhance the retry mechanisms to further reduce the chance of lost notifications.