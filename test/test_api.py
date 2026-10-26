from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# A valid request we reuse in several tests
GOOD_BODY = {
    "items": {"1": 1200, "2": 1500, "3": 600},
    "names": ["alice", "bob"],
    "claims": {"1": ["alice"], "2": ["bob"], "3": ["alice", "bob"]},
    "tax_cents": 264,
    "tip_cents": 660,
}

# ---- /parse ----

def test_parse_returns_items():
    fake_photo = ("receipt.jpg", b"fake image bytes", "image/jpeg")
    response = client.post("/parse", files={"file": fake_photo})
    assert response.status_code == 200
    assert len(response.json()["items"]) > 0


def test_parse_ids_are_unique():
    fake_photo = ("receipt.jpg", b"fake image bytes", "image/jpeg")
    items = client.post("/parse", files={"file": fake_photo}).json()["items"]
    ids = [item["id"] for item in items]
    assert len(ids) == len(set(ids))   # a set removes duplicates


# ---- /split: things that should work ----

def test_split_alice_bob():
    response = client.post("/split", json=GOOD_BODY)
    assert response.status_code == 200
    data = response.json()
    assert data["totals"] == {"alice": 1920, "bob": 2304}
    assert data["matches_receipt"] is True


# ---- /split: things that should be rejected ----

def test_split_unknown_person():
    body = {**GOOD_BODY, "claims": {"1": ["dan"]}}   # dan isn't in names
    response = client.post("/split", json=body)
    assert response.status_code == 400


def test_split_unknown_item():
    body = {**GOOD_BODY, "claims": {"9": ["alice"]}}  # item 9 doesn't exist
    response = client.post("/split", json=body)
    assert response.status_code == 400


def test_split_bad_type():
    body = {**GOOD_BODY, "tax_cents": "lots"}        # not a number
    response = client.post("/split", json=body)
    assert response.status_code == 422