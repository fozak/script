from google.colab import drive

# Mount Google Drive
drive.mount('/content/gdrive')

# Create website download directory in Google Drive
!mkdir -p /content/gdrive/MyDrive/website_download

# Install wget
!apt-get update
!apt-get install wget

# Specify website URL
website_url = "https://example.com"

# Download website to Google Drive
!wget \
    --mirror \
    --convert-links \
    --adjust-extension \
    --page-requisites \
    --no-parent \
    -P /content/gdrive/MyDrive/website_download \
    {website_url}

# Verify downloaded files
!ls -R /content/gdrive/MyDrive/website_download
