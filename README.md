# Transcript Generator (Docker Quickstart)

### 1. Set Up Environment Variables
Create a `.env.development` file at the root add fill your Google Cloud configuration:

### 2. Build the Image
```bash
docker build -t transcript-generator .
```

### 3. Run the Container
```bash
docker run -d -p 5001:5001 --env-file .env.development --name transcript-generator-container transcript-generator
```

### 4. Stop and Remove (to rebuild or restart)
If you get a container conflict or want to stop it:
```bash
docker stop transcript-generator-container
docker rm transcript-generator-container
```
*(Alternatively, you can start, stop, or delete the container using the **Docker Desktop GUI**.)*


### How to generate a secure token: You can run this quick Node.js command in your terminal to generate a secure random hex string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
