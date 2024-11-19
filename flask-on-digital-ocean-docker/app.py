from flask import Flask, request, jsonify
from pydantic import BaseModel, ValidationError
import pandas as pd
import json
from datetime import datetime

app = Flask(__name__)

# Initialize an empty DataFrame to hold the posts
posts_df = pd.DataFrame(columns=["id", "payload", "posted_at", "post_id", "username", "user_id", "topic_id", 
                                 "post_cooked", "post_raw", "post_number", "post_type", "reply_to_post_number", 
                                 "topic_archetype"])

class Post(BaseModel):
    post: dict  # Nested structure to accommodate the payload

@app.route("/post/", methods=["POST"])
def add_post():
    try:
        post_data = request.json
        post = Post(**post_data)  # Validate and create Post instance
        
        global posts_df
        new_id = len(posts_df) + 1
        
        # Extract the required fields from the nested JSON
        post_info = post.post
        payload = json.dumps(post_data)  # Convert the entire payload to JSON string
        posted_at = post_info["created_at"]  # This is already in the correct format
        
        # Create a new row in the DataFrame
        posts_df.loc[new_id] = [
            new_id,
            payload,
            posted_at,
            post_info["id"],  # post_id
            post_info["username"],
            post_info["user_id"],
            post_info["topic_id"],
            post_info["cooked"],  # post_cooked
            post_info["raw"],     # post_raw
            post_info["post_number"],
            post_info["post_type"],
            post_info["reply_to_post_number"],
            post_info["topic_archetype"]
        ]
        
        return jsonify({"message": "Post added!", "post_id": new_id}), 201
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

@app.route("/get/", methods=["GET"])
def get_posts():
    return jsonify(posts_df.to_dict(orient="records"))

@app.route("/query_posts/", methods=["GET"])
def query_posts():
    title = request.args.get("title", "")
    filtered_posts = posts_df[posts_df['payload'].str.contains(title, case=False)]
    return jsonify(filtered_posts.to_dict(orient="records"))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)