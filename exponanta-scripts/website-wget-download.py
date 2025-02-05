import os
from google.colab import files

# Create download directory
download_dir = "/content/website_download"
!mkdir -p {download_dir}

# Specify website URL
website_url = "https://example.com"

# Install wget
!apt-get update
!apt-get install wget zip

# Download website
!wget \
    --mirror \
    --convert-links \
    --adjust-extension \
    --page-requisites \
    --no-parent \
    -P {download_dir} \
    {website_url}

# Create ZIP of downloaded website
!cd /content && zip -r website_download.zip website_download

# Download ZIP to local PC
files.download("/content/website_download.zip")
