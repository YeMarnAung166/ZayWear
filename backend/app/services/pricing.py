from decimal import ROUND_HALF_UP, Decimal

KYAT = Decimal("1")


def quantize_kyat(value: Decimal) -> Decimal:
    """Myanmarese Kyat has no practical fractional unit; round half up."""
    return value.quantize(KYAT, rounding=ROUND_HALF_UP)


def compute_total(subtotal: Decimal, shipping_fee: Decimal) -> Decimal:
    return quantize_kyat(subtotal + shipping_fee)
