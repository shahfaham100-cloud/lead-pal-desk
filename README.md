# Sales Agent Hub

Can you create this type of small project? We need Sales Agent and Admin Role. This is the sales agent role.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://lead-pal-desk.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/743b808c-fcf1-4ab9-9766-e4e11689aff8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Deploy to Hostinger

Download and extract the GitHub ZIP, then run `npm install` and `npm run build:hostinger` using Node.js 22.12+ (22 LTS recommended). This creates `hostinger-upload/`; ZIP **the contents** of that folder and upload the ZIP to Hostinger's Node.js web app service. See [HOSTINGER.md](./HOSTINGER.md) for exact settings and backend requirements.

**Important:** Lovable Cloud's private server key is not exportable. An independent deployment requires a separately managed compatible backend with its own credentials and migrated data/files; packaging alone does not migrate them.

## Local development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
