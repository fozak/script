FROM python:latest

WORKDIR /home/app

COPY requirements.txt requirements.txt

# Upgrade pip and install packages from requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY app.py /home/app

CMD ["python", "app.py"]
