import json
import os
import lzma  # For reading .xz files

def load_json_from_xz(file_path):
    with lzma.open(file_path, 'rt') as file:
        return json.load(file)

def prepare_data(folder_path):
    posts = []

    for file in os.listdir(folder_path):
        if file.endswith('.jpg'):
            image_path = os.path.join(folder_path, file)
            json_path = os.path.join(folder_path, file.replace('.jpg', '.json.xz'))
            text_path = os.path.join(folder_path, file.replace('.jpg', '.txt'))

            # Load JSON data
            if os.path.exists(json_path):
                json_data = load_json_from_xz(json_path)
                caption = json_data.get('node', {}).get('caption', '')

                # Load text data if it exists
                if os.path.exists(text_path):
                    with open(text_path, 'r', encoding='utf-8') as text_file:
                        text_content = text_file.read().strip()
                        caption = text_content if text_content else caption

                # Prepare the post data
                post = {
                    'image': image_path,
                    'caption': caption,
                    'tags': json_data.get('node', {}).get('caption', '').split()  # Extract tags from caption
                }
                posts.append(post)

    return posts

def save_data_to_json(posts, output_file):
    with open(output_file, 'w', encoding='utf-8') as json_file:
        json.dump(posts, json_file, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    folder_path = '.'  # Change this to the folder where your images and data are located
    output_file = 'posts_data.json'
    
    posts_data = prepare_data(folder_path)
    save_data_to_json(posts_data, output_file)
    
    print(f"Data prepared and saved to {output_file}")