import asyncio
import aiohttp
import os
from urllib.parse import quote

# GitHub API base
API_BASE_URL = "https://api.github.com/repos/frappe/lms/contents"
BRANCH = "dfb82570ea77c74e5e0d905ff92c709568cb0877"
RAW_BASE_URL = "https://raw.githubusercontent.com/frappe/lms"
OUTPUT_FILE = "all_files.txt"

# Track processed files to avoid duplicates
processed_files = set()

async def get_files_recursive(session, path="lms/lms/doctype", processed_dirs=None):
    """Recursively fetch all files in a GitHub directory."""
    if processed_dirs is None:
        processed_dirs = set()
    
    # Skip if we've already processed this directory
    if path in processed_dirs:
        print(f"⏩ Skipping already processed directory: {path}")
        return []
    
    # Mark this directory as processed
    processed_dirs.add(path)
    
    url = f"{API_BASE_URL}/{path}?ref={BRANCH}"
    
    headers = {}  # Consider adding your GitHub token here for higher rate limits
    # headers = {"Authorization": "token YOUR_GITHUB_TOKEN"}
    
    try:
        async with session.get(url, headers=headers) as response:
            if response.status != 200:
                print(f"❌ Failed to fetch directory listing: {path}")
                print(f"Status code: {response.status}")
                error_text = await response.text()
                print(f"Response: {error_text}")
                return []
            
            file_data = await response.json()
            files = []
            
            # Create tasks for subdirectory processing
            subdir_tasks = []
            
            for item in file_data:
                if item["type"] == "file":
                    file_path = item["path"]
                    # Check if we've already processed this file
                    if file_path not in processed_files:
                        processed_files.add(file_path)
                        files.append(file_path)
                    else:
                        print(f"⏩ Skipping duplicate file: {file_path}")
                elif item["type"] == "dir":
                    subdir_path = item["path"]
                    print(f"🔍 Exploring directory: {subdir_path}")
                    # Create a task to process this subdirectory
                    task = asyncio.create_task(
                        get_files_recursive(session, subdir_path, processed_dirs)
                    )
                    subdir_tasks.append(task)
            
            # Wait for all subdirectory tasks to complete
            for task in asyncio.as_completed(subdir_tasks):
                subdir_files = await task
                files.extend(subdir_files)
            
            return files
    except Exception as e:
        print(f"❌ Error processing directory {path}: {str(e)}")
        return []

async def download_file(session, file_path, sem):
    """Download a single file with rate limiting."""
    file_url = f"{RAW_BASE_URL}/{BRANCH}/{file_path}"
    
    async with sem:  # Use semaphore to limit concurrent requests
        try:
            async with session.get(file_url) as response:
                if response.status == 200:
                    content = await response.text()
                    print(f"✅ Downloaded: {file_path}")
                    return file_path, content
                else:
                    print(f"❌ Failed to fetch: {file_path}")
                    print(f"Status code: {response.status}")
                    print(f"URL attempted: {file_url}")
                    return file_path, None
        except Exception as e:
            print(f"❌ Error downloading {file_path}: {str(e)}")
            return file_path, None

async def download_and_save(file_list):
    """Download files concurrently and append to a single text file with separators."""
    # Use a semaphore to limit the number of concurrent requests
    # to avoid overwhelming the GitHub API
    sem = asyncio.Semaphore(5)  # Max 5 concurrent requests
    
    async with aiohttp.ClientSession() as session:
        # Create download tasks for all files
        tasks = [download_file(session, file_path, sem) for file_path in file_list]
        
        # Open file once for writing all content
        with open(OUTPUT_FILE, "w", encoding="utf-8") as outfile:
            for completed_task in asyncio.as_completed(tasks):
                file_path, content = await completed_task
                if content is not None:
                    outfile.write(f"\\{file_path}\n")  # Separator in the requested format
                    outfile.write(content + "\n\n")  # Append content

async def main():
    # Create a single session for all requests
    async with aiohttp.ClientSession() as session:
        # Fetch file list (recursive)
        print("🔍 Starting to discover files...")
        file_list = await get_files_recursive(session)
        
        if file_list:
            print(f"📋 Found {len(file_list)} unique files. Starting download...")
            await download_and_save(file_list)
            print(f"\n✅ All files saved to {OUTPUT_FILE}")
            print(f"Total unique files processed: {len(processed_files)}")
        else:
            print("⚠️ No files found.")

# Run the async main function
if __name__ == "__main__":
    asyncio.run(main())
