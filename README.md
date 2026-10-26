# recipe-split

A mobile-friendly web app for splitting a restaurant receipt. Upload a photo,
add everyone's names, tap who ate what, choose a tip, and see what each person
owes.

## Running locally

Requires Python 3.10+.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Then open http://127.0.0.1:8000. To use it from a phone on the same Wi-Fi,
start the server with `uvicorn app.main:app --host 0.0.0.0` and visit
`http://<your-computer's-IP>:8000`.

## How it works

- `POST /parse` takes an uploaded image and returns
  `{"items": [{"id", "name", "price_cents"}], "tax_cents"}`. The parser
  (`app/parser.py`) is a placeholder for now: it ignores the image and returns
  `data/sample_receipt.json`.
- `POST /split` takes `items` (item id → price in cents), `names`, `claims`
  (item id → list of names), `tax_cents` and `tip_cents`, and calls
  `splitter.split.split`. It returns `totals` (name → cents),
  `receipt_total_cents` and `matches_receipt`. A claim that names an unknown
  item id or person gets a 400 error.
- Interactive API docs (try the endpoints in your browser) are at
  http://127.0.0.1:8000/docs while the server is running.
- The tip is a percentage of the pre-tax subtotal (default 20%), converted to
  cents in the browser.
- All money is handled as integer cents and only formatted as dollars for display.

## Running tests

```bash
pytest
```
