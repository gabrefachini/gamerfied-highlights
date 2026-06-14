# GitHub Setup

This app should live in its own private GitHub repository.

## Create Private Repo

Create a new private repository named:

```text
gamerfied-highlights
```

Do not initialize it with a README if you are pushing this local project as the first commit.

## First Push

From the standalone project directory:

```bash
git init
git add .
git commit -m "Initial Gamerfied Highlights app"
git branch -M main
git remote add origin git@github.com:<org-or-user>/gamerfied-highlights.git
git push -u origin main
```

If this directory remains temporarily inside the main Gamerfied working tree, do not use the parent repository remote for this project.

## Branch Strategy

- `main`: deployable MVP branch
- `feat/*`: feature branches
- `fix/*`: bug fixes
- `infra/*`: deployment and infrastructure changes

Open pull requests into `main` once CI exists.

## .gitignore

The project `.gitignore` excludes:

- `node_modules`
- `.next`
- `.env`
- `.env.local`
- uploaded demos
- logs
- coverage output

Never commit real secrets or uploaded demo files.

## EC2 Deploy Key

On EC2:

```bash
ssh-keygen -t ed25519 -C "gamerfied-highlights-ec2"
cat ~/.ssh/id_ed25519.pub
```

Add the public key in GitHub:

```text
Repository Settings -> Deploy keys -> Add deploy key
```

Read-only access is enough for deployment pulls.

## GitHub Actions TODO

Add CI later for:

- `npm install`
- `npm run build`
- Prisma schema validation
- Unit tests once parser fixtures are added

Deployment automation can be added after the first manual EC2 deployment is stable.
