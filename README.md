# ember-engine

## Setup

To run the project, you need to have the package manager:

- [yarn](https://classic.yarnpkg.com/lang/en/docs/install)
- [docker](https://www.docker.com/)
- [docker-compose](https://docs.docker.com/compose/)

After installing `yarn`, you need to run the databases locally. The database used for
this service is [Chroma](https://www.trychroma.com/) and `postgres`. First,
create a directory in the root of the repository named `chroma`. Then run the
following command in the root of the repository:

```bash
docker compose -f compose.local.yml up -d
```

Following that, obtain the following API keys:

- [Open AI](https://openai.com/): An open AI key. For the education step to
  work, you'll need a Tier 1 account, for which you will need a minimum 5 dollar
  charge in the account.

Lastly, create a test bot by writing to [BotFather](https://t.me/BotFather) and
get a token with the username you choose for the test bot. When creating the bot, make
sure to disable privacy mode to have seemless experience with group chats.

Then create the `.env` file in the root of the directory as such:

```sh
CHROMA_HOST="localhost"
CHROMA_PORT=8000
OPENAI_API_KEY="YOUR_OPEN_AI_KEY_HERE"
TELEGRAM_BOT_USERNAME="THE_USERNAME_YOU_SELECTED"
TELEGRAM_BOT_TOKEN="THE_TOKEN_BOT_FATHER_GAVE_YOU"
SECRET_SALT="my_secret_salt"
EMBER_CORE_URL="http://localhost:8101"
IS_TESTNET="true"
DB_USER="user"
DB_PASSWORD="password"
DB_NAME="db"
DB_HOST="localhost"
DB_PORT=5432
FUNDING_WALLET_ID="random_id_for_ember_wallet"
```

Lastly, run:

```sh
yarn dev
```

If it was sucessfull, you should see in your console something like:

```bash
(node:12714) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("ts-node/esm", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
chunk count: 21

...ready
Transaction service running at http://0.0.0.0:3000
```

## Linting

The codebase should be formatted using `prettier` and should follow the recommendations
that `eslint` gives with the according configuration setup in the repository. To fix
all the code style errors and get some corrections from eslint do:

```bash
yarn lint:fix
```

Additionally, the `.vscode` folder has been setup so the formatter is run on each file
save. Please install the recommended extensions for it to work, that is install
`esbenp.prettier-vscode`.
