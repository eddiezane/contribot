# contribot

Contribot rewards open source contributors with swag! It receives a webhook from GitHub and takes action if a PR was merged. It's currently built to only work for the swag distributor [Printfection](Printfection).

This is a reimplementation of [elbuo8/contribot](https://github.com/elbuo8/contribot).


## ENV Vars
```bash
MONGO_URL=URL for mongo://db
GITHUB_HMAC_SECRET=Some string. Read about it here https://developer.github.com/webhooks/securing/
GITHUB_USER_TOKEN=An oauth token used to comment
GITHUB_CLIENT_ID=Your GitHub apps ID
GITHUB_CLIENT_SECRET=Your GitHub apps secret
```

## Printfection Giveaway Campaign
TODO: