# Local Development & GCP Event Integration Guide

This guide explains how to configure and run the `transcriptGenerator` service locally and integrate it with Google Cloud Storage (GCS) using **localtunnel** and **Google Cloud Shell** for real-time event-driven testing.

---

## 1. Local Environment Configuration

Ensure you have a `.env.development` file in the root directory with the following variables:

```env
PORT=5001
GCP_PROJECT_ID=atm-datalake1
GCS_BUCKET_NAME=atm-defense
LOCATION=us-central1
GEMINI_MODEL=gemini-2.5-pro

# Secret verification token for incoming Pub/Sub webhook calls
PUBSUB_VERIFICATION_TOKEN=5f2d7db5559c7e2877268172f04ef1f8accebfbfa95265018fcb99e7c2584c65

# Location path of your Google Cloud Service Account JSON Key file
GOOGLE_APPLICATION_CREDENTIALS=./gcp-key.json
```

---

## 2. Expose the Local Server (Tunneling)

Since Google Cloud services run on the public internet, they cannot access `localhost:5001` directly. We use `ngrok` to create a secure public URL.

1. Sign up for a free account at [ngrok.com](https://dashboard.ngrok.com/signup) and copy your **Authtoken**.
2. Add your authtoken locally:
   ```bash
   npx ngrok config add-authtoken YOUR_AUTHTOKEN
   ```
3. Expose port 5001:
   ```bash
   npx ngrok http 5001
   ```

Copy the generated forwarding URL (e.g., `https://xxxx.ngrok-free.dev`).

---

## 3. Configure Google Cloud Storage (GCS) and Pub/Sub

Since the `gcloud` CLI might not be installed on your local development machine, configure this via **Google Cloud Shell** in your browser.

### Step A: Open Cloud Shell
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the **Activate Cloud Shell** button (`>_` terminal icon) in the top-right header.

### Step B: Link GCS Bucket to a Pub/Sub Topic
Run this command in the Cloud Shell terminal to notify Pub/Sub when a file is uploaded to GCS:
```bash
gcloud storage buckets notifications create gs://atm-defense --topic=gcs-video-uploads
```

### Step C: Create the Push Subscription
Create a push subscription that forwards notifications to your local server. Replace `YOUR_TUNNEL_URL` with the URL you got from `ngrok`:
```bash
gcloud pubsub subscriptions create gcs-video-uploads-sub \
    --topic=gcs-video-uploads \
    --push-endpoint="YOUR_TUNNEL_URL/webhook/gcs?token=5f2d7db5559c7e2877268172f04ef1f8accebfbfa95265018fcb99e7c2584c65" \
    --ack-deadline=60
```

---

## 4. Run & Test the Application

### Start the local development server:
In the project root, start the server using `nodemon` (which monitors `.js` and `.env` changes):
```bash
npm run dev
```

### Live Test:
Upload a video file to the bucket path `gs://atm-defense/ashish/youtube/video/videoplayback.mp4`. The server will automatically:
1. Receive the notification via ngrok.
2. Transcode the video to `temp.wav` in GCS under `ashish/youtube/video/videoplayback-transcript/`.
3. Query Gemini 2.5 on Vertex AI to transcribe the audio.
4. Save the formatted transcript files:
   *   `ashish/youtube/video/videoplayback-transcript/transcript.txt`
   *   `ashish/youtube/video/videoplayback-transcript/transcript.json`
5. Automatically clean up the `temp.wav` and `status.json` files.
