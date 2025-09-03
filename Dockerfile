FROM python:3.13.1-alpine3.21

WORKDIR /app

COPY docker/backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt


CMD [ "python", "./app.py" ]