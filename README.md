# Discord Bio Changer

Automatically update Discord bio with Tetr.io and Jstris stats

NOTE: This isn't really usable without a bit of programming knowledge...

I'm using:
- [Vercel Functions](https://vercel.com/docs/concepts/functions/serverless-functions) for the actual code
- [Firebase Database](https://firebase.google.com/docs/database/rest/start) for storing the previous bio, so I don't change my bio too often and Discord doesn't ban me (probably unnecessary)
- [cron-job.org](https://cron-job.org/en/) for running the Vercel Function every half an hour
