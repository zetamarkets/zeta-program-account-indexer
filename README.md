# zeta-program-account-indexer

Indexes specific accounts from the Zeta program.

## Install dependencies

```sh
yarn install
```

## Testing locally

Build the docker image locally

```sh
docker build -t zeta-program-accounts-indexer:latest .
```

Then run the image, grabbing environmental variables from a `.env` file (you can see an example in `.env.example`)

```sh
docker run --rm --env-file=.env zeta-program-accounts-indexer
```
