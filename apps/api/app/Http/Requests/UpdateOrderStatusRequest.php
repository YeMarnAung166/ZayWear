<?php

namespace App\Http\Requests;

use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOrderStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => [
                'required',
                Rule::in([
                    Order::STATUS_CONFIRMED,
                    Order::STATUS_PACKED,
                    Order::STATUS_SHIPPED,
                    Order::STATUS_DELIVERED,
                    Order::STATUS_CANCELLED,
                    Order::STATUS_REFUSED,
                    Order::STATUS_RETURNED,
                ]),
            ],
            'reason' => ['nullable', 'string', 'max:255'],
            'refusal_reason' => [
                'required_if:status,'.Order::STATUS_REFUSED,
                'nullable',
                Rule::in(['wrong_size', 'too_expensive', 'did_not_order', 'unreachable', 'changed_mind', 'other']),
            ],
        ];
    }
}
