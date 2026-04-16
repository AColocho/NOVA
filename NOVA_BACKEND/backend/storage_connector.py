import os

import boto3


class StorageClient:
    def __init__(self) -> None:
        self.receipt_bucket = os.environ["RECEIPT_BUCKET"]
        self.client = boto3.client(
            "s3",
            endpoint_url=os.environ["AWS_ENDPOINT_URL"],
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
            region_name=os.environ.get("AWS_REGION", "us-east-1"),
        )
