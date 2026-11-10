# YonoX

### A Virtual Stock Market and Financial Education Platform

YonoX is an educational virtual stock market platform designed to simulate important concepts of financial markets, stock trading, company ownership, and digital account management.

The platform uses its own virtual currency, YNC, allowing users to explore a simulated economy without using real money.

---

## Table of Contents

- [Overview](#overview)
- [Main Features](#main-features)
- [Virtual Currency](#virtual-currency)
- [Account Registration](#account-registration)
- [Token-Based Login](#token-based-login)
- [Stock Market](#stock-market)
- [Company Ownership](#company-ownership)
- [Company Listings](#company-listings)
- [Mathematics Rewards](#mathematics-rewards)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Running the Server](#running-the-server)
- [Using YonoX](#using-yonox)
- [Account Security](#account-security)
- [Project Structure](#project-structure)
- [Technology](#technology)
- [Important Notes](#important-notes)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Future Development](#future-development)

---

## Overview

YonoX brings together a virtual stock market, company ownership features, a virtual currency system, and educational reward mechanics.

The goal is to provide an interactive environment where users can learn about:

- Stock market concepts.
- Buying and selling shares.
- Company ownership.
- Market activity and price movements.
- Virtual account balances.
- Financial decision-making.
- Supply and demand.
- Basic market participation.

All transactions within YonoX use virtual currency.

YonoX is an educational simulation, not a real financial exchange.

## Main Features

### 1. User Accounts

- Create an account using a username.
- Receive a unique account access token.
- Log in using the account token.
- Access personal account information.
- Manage account-related features.

### 2. Token-Based Authentication

YonoX supports token-based account access.

During registration, the platform generates a unique account token.

Important characteristics:

- Account tokens are generated securely.
- The server stores a SHA-256 hash instead of the original account token.
- The original token is displayed during registration.
- Users can generate a replacement token from their account page.
- Generating a replacement invalidates the previous token.
- The account token can be copied for future login.

**Important:** Save your account token somewhere safe. The original token cannot be recovered from its stored hash.

### 3. Virtual Stock Market

YonoX provides a simulated stock market environment.

The platform is designed around virtual trading and company shares.

Users can explore market participation and learn how stock ownership and trading work in a simulated economy.

### 4. Company Ownership

YonoX includes company ownership functionality.

The platform supports ownership-related operations and company management features.

Company ownership is represented within the platform's virtual economy.

### 5. Company Listings

Company listings allow ownership interests to be offered within the platform.

This creates a marketplace-style environment for simulated ownership transactions.

### 6. Virtual Economy

YonoX uses YNC as its internal virtual currency.

YNC is used within the platform's economy and does not represent real money.

### 7. Mathematics Rewards

YonoX includes a daily mathematics reward system.

Users receive up to 20 question attempts per day.

Each submitted answer consumes one attempt, whether the answer is correct or incorrect.

Reward levels:

| Difficulty | Correct Answer Reward |
|---|---:|
| Easy | 10 YNC |
| Medium | 100 YNC |
| Hard | 500 YNC |

Incorrect answers do not grant a reward.

The daily attempt limit makes the reward system a limited educational activity.

---

## Virtual Currency

YNC is the virtual currency used by YonoX.

It is designed for simulated transactions and platform activities.

YNC:

- Is not a real-world currency.
- Is not a bank deposit.
- Is not a cryptocurrency investment.
- Has no guaranteed real-world monetary value.
- Is intended for use inside YonoX.

Never send real money in exchange for YNC.

## Account Registration

To create an account:

1. Open the YonoX website.
2. Select the registration option.
3. Enter a username.
4. Submit the registration form.
5. Save the generated account token.
6. Keep the token private.

The account token is an important part of your account access.

## Token-Based Login

To log in:

1. Open the YonoX website.
2. Select the login option.
3. Enter your account token.
4. Submit the login form.
5. Access your account.

You do not need to enter your username when using token-based login.

## Stock Market

The stock market is a simulated environment intended to demonstrate market concepts.

Important concepts include:

- Share ownership.
- Trading activity.
- Buying and selling.
- Company valuation concepts.
- Market participation.
- Virtual balances.

All market activity takes place using the platform's virtual economy.

## Company Ownership

Company ownership features allow users to interact with ownership interests.

The platform includes ownership management and related company operations.

Users should review transaction information carefully before confirming any ownership-related operation.

## Company Listings

The company listing system provides a way to offer ownership interests through the platform.

Listings are part of the simulated marketplace and should not be confused with real-world securities.

## Mathematics Rewards

The daily mathematics system provides an educational way to earn virtual currency.

Daily limit:

**20 attempts per user.**

Rewards:

- Easy: 10 YNC.
- Medium: 100 YNC.
- Hard: 500 YNC.

Rules:

- Every submitted answer consumes one attempt.
- Correct answers receive the reward for their difficulty.
- Incorrect answers receive no reward.
- Attempts are limited daily.

---

## Getting Started

Before running YonoX, make sure you have a supported Node.js installation.

The project uses Node.js and SQLite-related database functionality.

## Installation

Clone the repository:

```bash
git clone https://github.com/yonukitube/YonoX.git
```

Enter the project directory:

```bash
cd YonoX
```

Check your Node.js installation:

```bash
node --version
```

## Running the Server

Start the application:

```bash
node server.js
```

The development server is configured to use port `8766` in the current setup.

Open the application locally:

```text
http://127.0.0.1:8766
```

If you are accessing the server from another device, use the server's reachable network address and make sure the network configuration allows the connection.

## Using YonoX

A typical user journey:

1. Open the application.
2. Register a new account.
3. Save the account token.
4. Explore the account page.
5. Review the virtual currency balance.
6. Explore available market features.
7. Learn about company ownership.
8. Participate in mathematics questions.
9. Use the token to log in again when needed.

The exact features available depend on the current application version.

## Account Security

Protect your account token.

Recommended practices:

- Never publish your token.
- Never send your token to strangers.
- Do not include tokens in screenshots.
- Keep a private backup of your token.
- Generate a replacement if you believe your token has been exposed.
- Do not commit database files, private keys, certificates, or local configuration files to GitHub.

YonoX stores token hashes rather than original account tokens.

## Project Structure

```text
YonoX/
├── app.js
├── index.html
├── server.js
├── yonox-i18n.js
├── yonox-ownership.js
├── yonox-ui.js
├── yonox-token-patch.py
├── .gitignore
└── README.md
```

### Important Files

| File | Purpose |
|---|---|
| `server.js` | Backend server and API functionality |
| `app.js` | Main application logic |
| `index.html` | Main web application page |
| `yonox-i18n.js` | Language and translation support |
| `yonox-ownership.js` | Company ownership interface |
| `yonox-ui.js` | User interface components |
| `yonox-token-patch.py` | Token authentication patch utility |
| `.gitignore` | Excludes local and sensitive files |

## Technology

The project uses technologies including:

- JavaScript.
- Node.js.
- HTML.
- CSS.
- SQLite.
- HTTP APIs.
- SHA-256 token hashing.

## Important Notes

- YonoX is a virtual educational platform.
- YNC is an internal virtual currency.
- No real-money trading is provided by the virtual currency system.
- Account tokens should be treated as private credentials.
- This repository may evolve as new features are developed.
- Always back up your local database before performing maintenance.

## Frequently Asked Questions

### Is YonoX a real stock exchange?

No. YonoX is a virtual stock market simulation.

### Is YNC real money?

No. YNC is an internal virtual currency.

### Can I log in without my username?

Yes. Token-based login uses your account token.

### What happens if I lose my account token?

The original token cannot be recovered from its stored hash. If you are still logged in, generate a replacement from your account page and save it securely.

### Does generating a new token invalidate the old one?

Yes. A replacement token supersedes the previous account token.

### How many mathematics attempts are available daily?

The system provides 20 attempts per day.

### Do incorrect answers consume attempts?

Yes. Every submitted answer consumes one attempt.

### Can I use YonoX to invest real money?

No. YonoX is intended for educational simulation, not real financial investment.

## Future Development

YonoX is an evolving project.

Potential areas of continued development include:

- Expanded market simulation.
- Improved market analytics.
- Additional company management features.
- More account management tools.
- Improved user experience.
- Additional educational activities.
- Further security improvements.
- More detailed market information.

These are development possibilities and are not promises of existing functionality.

---

## Repository

GitHub: https://github.com/yonukitube/YonoX

## License

No open-source license has been specified yet. All rights remain with the respective copyright holder unless a license is added to this repository.

---

**YonoX — Learn the Market. Explore Ownership. Build Your Virtual Economy.**
