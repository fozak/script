https://chatgpt.com/c/68f98ae1-923c-832d-93b8-c5c0cae9ae26

https://chatgpt.com/c/68f99472-5264-832b-b412-e86b94037d6b


✅ How to fix

You need to mount your host folder to /pb_data, where the app expects it:

docker stop pocketbase
docker rm pocketbase

docker run -d \
  --name pocketbase \
  -p 8090:8090 \
  -v /home/dokploy-agent/pb_data:/pb_data \
  ghcr.io/muchobien/pocketbase:latest

🧾 Check after start
docker exec pocketbase ls -lh /pb_data


You should now see your full 4.2 MB data.db and other files, and PocketBase will read the correct DB.