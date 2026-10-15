"""Seed the ZayWear catalog with demo data.

Run from the ``backend/`` directory (uses ``DATABASE_URL`` from `.env`)::

    python -m scripts.seed

Idempotent: if products already exist it exits without changes.
"""

from __future__ import annotations

from decimal import Decimal

from sqlmodel import Session, select

from app.database import engine
from app.models import Product, ProductVariant, Township

TOWNSHIPS = [
    {"name": "Mayangone", "region": "Yangon", "shipping_fee": "2000", "supports_cod": True},
    {"name": "Hlaing", "region": "Yangon", "shipping_fee": "2500", "supports_cod": True},
    {"name": "Chan Aye Thar Zan", "region": "Mandalay", "shipping_fee": "3500", "supports_cod": True},
    {"name": "Remote / Village", "region": "Other", "shipping_fee": "6000", "supports_cod": False},
]

PRODUCTS = [
    {
        "name": "Linen Camp Shirt",
        "description": "Breathable linen-blend shirt with a relaxed collar.",
        "base_price": "18500.00",
        "variants": [
            ("S", "Sand", 8),
            ("M", "Sand", 12),
            ("L", "Sand", 6),
            ("M", "Sage", 5),
        ],
    },
    {
        "name": "Everyday Cotton Tee",
        "description": "Heavyweight combed-cotton tee that keeps its shape.",
        "base_price": "9500.00",
        "variants": [
            ("S", "White", 20),
            ("M", "White", 25),
            ("L", "White", 15),
            ("M", "Charcoal", 10),
        ],
    },
    {
        "name": "Wide-Leg Pleated Trousers",
        "description": "High-waist pleated trousers with a fluid drape.",
        "base_price": "24000.00",
        "variants": [
            ("26", "Oat", 4),
            ("28", "Oat", 6),
            ("30", "Oat", 5),
            ("30", "Black", 3),
        ],
    },
]


def seed() -> None:
    with Session(engine) as session:
        if session.exec(select(Product)).first() is not None:
            print("Catalog already seeded; nothing to do.")
            return

        for row in TOWNSHIPS:
            session.add(
                Township(
                    name=row["name"],
                    region=row["region"],
                    shipping_fee=Decimal(row["shipping_fee"]),
                    supports_cod=bool(row["supports_cod"]),
                )
            )

        for row in PRODUCTS:
            product = Product(
                name=row["name"],
                description=row["description"],
                base_price=Decimal(row["base_price"]),
            )
            session.add(product)
            session.flush()
            for size, color, stock in row["variants"]:
                session.add(
                    ProductVariant(
                        product_id=product.id,
                        size=size,
                        color=color,
                        stock_quantity=stock,
                        sku=f"{product.id}-{size}-{color}".upper(),
                    )
                )

        session.commit()
        print(
            f"Seeded {len(PRODUCTS)} products and {len(TOWNSHIPS)} townships."
        )


if __name__ == "__main__":
    seed()
