# Update Search It to the latest version

To update Search It to the latest version, follow these steps:

## For Docker users (Using pre-built images)

Simply pull the latest image and restart your container:

```bash
docker pull shikharjadav/search-it:latest
docker stop search-it
docker rm search-it
docker run -d -p 3000:3000 -v search-it-data:/home/search-it/data --name search-it shikharjadav/search-it:latest
```

For slim version:

```bash
docker pull shikharjadav/search-it:slim-latest
docker stop search-it
docker rm search-it
docker run -d -p 3000:3000 -e SEARXNG_API_URL=http://your-searxng-url:8080 -v search-it-data:/home/search-it/data --name search-it shikharjadav/search-it:slim-latest
```

Once updated, go to http://localhost:3000 and verify the latest changes. Your settings are preserved automatically.

## For Docker users (Building from source)

1. Navigate to your Search It directory and pull the latest changes:

   ```bash
   cd search-it
   git pull origin master
   ```

2. Rebuild the Docker image:

   ```bash
   docker build -t search-it .
   ```

3. Stop and remove the old container, then start the new one:

   ```bash
   docker stop search-it
   docker rm search-it
   docker run -p 3000:3000 -p 8080:8080 --name search-it search-it
   ```

4. Once the command completes, go to http://localhost:3000 and verify the latest changes.

## For non-Docker users

1. Navigate to your Search It directory and pull the latest changes:

   ```bash
   cd search-it
   git pull origin master
   ```

2. Install any new dependencies:

   ```bash
   npm i
   ```

3. Rebuild the application:

   ```bash
   npm run build
   ```

4. Restart the application:

   ```bash
   npm run start
   ```

5. Go to http://localhost:3000 and verify the latest changes. Your settings are preserved automatically.

---
