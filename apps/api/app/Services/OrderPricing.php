<?php

namespace App\Services;

use App\Models\ProductVariant;
use App\Models\Setting;
use App\Models\Township;

/**
 * Authoritative pricing. See ARCHITECTURE.md §6.
 * Client-supplied totals are never trusted.
 */
class OrderPricing
{
    /**
     * @param  array<int, array{variant: ProductVariant, qty: int}>  $lines
     * @return array{subtotal_mmk: int, delivery_fee_mmk: int, discount_mmk: int, total_mmk: int}
     */
    public function quote(array $lines, Township $township, int $discountMmk = 0): array
    {
        $subtotal = 0;

        foreach ($lines as $line) {
            $unit = $line['variant']->product->base_price_mmk + $line['variant']->price_delta_mmk;
            $subtotal += $unit * $line['qty'];
        }

        $threshold = (int) Setting::get('free_delivery_threshold_mmk', 80000);
        $fee = $subtotal >= $threshold ? 0 : $township->delivery_fee_mmk;

        return [
            'subtotal_mmk' => $subtotal,
            'delivery_fee_mmk' => $fee,
            'discount_mmk' => $discountMmk,
            'total_mmk' => max(0, $subtotal + $fee - $discountMmk),
        ];
    }

    public function unitPrice(ProductVariant $variant): int
    {
        return $variant->product->base_price_mmk + $variant->price_delta_mmk;
    }
}
