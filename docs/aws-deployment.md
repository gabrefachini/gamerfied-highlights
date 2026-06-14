# AWS Deployment Plan

Recommended MVP deployment:

- EC2 Ubuntu instance
- Node.js app managed by PM2
- Nginx reverse proxy
- PostgreSQL on RDS, or local PostgreSQL for the first MVP only
- Redis local on EC2, or ElastiCache later
- S3 for uploaded demos and generated videos later

## Security Groups

Open inbound:

- `22/tcp` from your IP for SSH
- `80/tcp` from the internet for HTTP
- `443/tcp` from the internet for HTTPS

Do not open PostgreSQL or Redis to the public internet. If using RDS or ElastiCache, allow access only from the EC2 security group.

## Server Bootstrap

```bash
sudo apt update
sudo apt install -y nginx git build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

Optional local infrastructure for MVP:

```bash
sudo apt install -y postgresql redis-server
sudo systemctl enable --now postgresql redis-server
```

Prefer RDS and ElastiCache once uploads and render jobs become business-critical.

## App Deploy

```bash
git clone git@github.com:<org-or-user>/gamerfied-highlights.git
cd gamerfied-highlights
npm install
cp .env.example .env
nano .env
npm run prisma:migrate
npm run build
pm2 start npm --name gamerfied-highlights-web -- start
pm2 start npm --name gamerfied-highlights-worker -- run worker:analyze
pm2 save
pm2 startup
```

Environment values should be separate from the main Gamerfied app:

```env
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
UPLOAD_DIR="/var/app/gamerfied-highlights/uploads"
S3_BUCKET=""
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
APP_URL="https://highlights.example.com"
```

Do not commit real secrets.

## Nginx Reverse Proxy

Create `/etc/nginx/sites-available/gamerfied-highlights`:

```nginx
server {
    listen 80;
    server_name highlights.example.com;

    client_max_body_size 750m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/gamerfied-highlights /etc/nginx/sites-enabled/gamerfied-highlights
sudo nginx -t
sudo systemctl reload nginx
```

Add TLS later with Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d highlights.example.com
```

## Restart Commands

```bash
pm2 restart gamerfied-highlights-web
pm2 restart gamerfied-highlights-worker
sudo systemctl reload nginx
```

## Logs

```bash
pm2 logs gamerfied-highlights-web
pm2 logs gamerfied-highlights-worker
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## S3 Later

For production storage, move uploaded demos and rendered videos to S3. Keep local disk as a temporary staging area only, and clean intermediate files after parsing/rendering.
