from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.parser import parse_receipt
from splitter.split import split

STATIC_DIR = Path(__file__).resolve().parent / "static"

app = FastAPI(title="Receipt Splitter")

# Browsers block a page on one origin (the Vite dev server, port 5173) from
# calling an API on another (port 8000) unless the API allows it via CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic models ---
# FastAPI uses these to validate incoming JSON and to shape responses.
# A wrong type (e.g. a string where an int belongs) gets an automatic 422 error.

class Item(BaseModel):
    id: str
    name: str
    price_cents: int


class ParseResponse(BaseModel):
    items: list[Item]
    tax_cents: int


class SplitRequest(BaseModel):
    items: dict[str, int]          # item id -> price in cents
    names: list[str]               # everyone at the table
    claims: dict[str, list[str]]   # item id -> names of who ate it
    tax_cents: int
    tip_cents: int


class SplitResponse(BaseModel):
    totals: dict[str, int]         # name -> what they owe, in cents
    receipt_total_cents: int       # items + tax + tip
    matches_receipt: bool          # do the totals add up to the receipt?


# --- Endpoints ---

# `response_model` tells FastAPI to check the return value against the model
# and to document it at /docs.
@app.post("/parse", response_model=ParseResponse)
async def parse(file: UploadFile = File(...)):
    # File(...) means "a required file upload" (needs python-multipart).
    image_bytes = await file.read()
    return parse_receipt(image_bytes)  # ignores the image for now


@app.post("/split", response_model=SplitResponse)
def split_receipt(req: SplitRequest):
    # The request body is parsed into a SplitRequest automatically.
    for item_id, people in req.claims.items():
        if item_id not in req.items:
            raise HTTPException(400, f"Claim mentions unknown item id '{item_id}'.")
        for name in people:
            if name not in req.names:
                raise HTTPException(400, f"Item '{item_id}' is claimed by '{name}', who isn't in names.")

    # split() divides by the subtotal, so an empty receipt would crash it.
    if sum(req.items.values()) == 0:
        raise HTTPException(400, "Receipt subtotal must be greater than zero.")

    totals = split(req.items, req.names, req.claims, req.tax_cents, req.tip_cents)

    receipt_total = sum(req.items.values()) + req.tax_cents + req.tip_cents
    return SplitResponse(
        totals=totals,
        receipt_total_cents=receipt_total,
        matches_receipt=sum(totals.values()) == receipt_total,
    )


# --- Frontend ---
# Serve the HTML/JS/CSS in app/static, with index.html at "/".
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")
