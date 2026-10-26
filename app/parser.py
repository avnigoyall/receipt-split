import json
from pathlib import Path

SAMPLE_RECEIPT = Path(__file__).resolve().parent.parent / "data" / "sample_receipt.json"


def parse_receipt(image_bytes):
    """Return the receipt's items and tax in integer cents.

    Placeholder: ignores the image and returns the sample receipt.
    """
    with open(SAMPLE_RECEIPT) as f:
        receipt = json.load(f)
    return {
        "items": [
            {"id": str(item["id"]), "name": item["name"], "price_cents": int(item["price_cents"])}
            for item in receipt["items"]
        ],
        "tax_cents": int(receipt["tax_cents"]),
    }
