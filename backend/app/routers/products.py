from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select

from app.dependencies import AdminUserDep, SessionDep
from app.models import Product, ProductVariant
from app.schemas import ProductRead

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductRead])
def list_products(
    session: SessionDep,
    active_only: bool = Query(default=True),
) -> list[Product]:
    statement = select(Product)
    if active_only:
        statement = statement.where(Product.is_active == True)  # noqa: E712
    return list(session.exec(statement).all())


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, session: SessionDep) -> Product:
    product = session.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/{product_id}/variants", response_model=list[ProductVariant])
def list_variants(product_id: int, session: SessionDep) -> list[ProductVariant]:
    if session.get(Product, product_id) is None:
        raise HTTPException(status_code=404, detail="Product not found")
    statement = select(ProductVariant).where(ProductVariant.product_id == product_id)
    return list(session.exec(statement).all())


@router.patch(
    "/{product_id}/variants/{variant_id}/stock",
    response_model=ProductVariant,
)
def update_stock(
    product_id: int,
    variant_id: int,
    stock_quantity: int,
    session: SessionDep,
    _admin: AdminUserDep,
) -> ProductVariant:
    variant = session.get(ProductVariant, variant_id)
    if variant is None or variant.product_id != product_id:
        raise HTTPException(status_code=404, detail="Variant not found")
    variant.stock_quantity = stock_quantity
    session.add(variant)
    session.commit()
    session.refresh(variant)
    return variant
