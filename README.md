# fantastic-umbrella
*The YourBCABus Backend*

## Getting started
fantastic-umbrella requires Node.js and [MongoDB](http://www.mongodb.org) to be installed.

Install the dependencies with:

```sh
npm install
```

Compile the TypeScript by running:

```sh
npm run build
```

Start the server with:

```sh
npm start
```

You'll need a config.json file to start the server. You can ask @anli5005 for one, or [attempt to piece it together yourself](https://github.com/YourBCABus/fantastic-umbrella/blob/18725a1b2339d3466e6ebe196e6c8f07a5e39b20/src/interfaces.ts#L7).

**Tip:** Run `tsc` in watch mode and use a tool such as `nodemon` to automatically restart the server. Here's the commands I use to do that:

```sh
npm run build -- -w
nodemon -w dist -d 0.5 # in a different terminal
```

## Contributing & Deployment

Code in the main branch should always be production-ready. Features or anything that might require a review should be committed to a different branch.

It's my intent to set up CD sometime soon.

## Common tasks

### Modifying a DB schema
1. Update `interfaces.ts`.
2. Update `models.ts` to reflect the updated schema.

### Adding a GraphQL query/mutation
1. Add the query/mutation to `yourbcabus.graphql` in the root folder.
2. Add the corresponding resolver to `resolvers.ts`.

### Adding to the legacy REST API
Don't.

(The legacy REST API is comprised of `schools.ts`, `buses.ts`, `stops.ts`, `dismissal.ts`, and `alerts.ts`. They will be replaced by the GraphQL API.)