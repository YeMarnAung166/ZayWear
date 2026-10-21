<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'customer.name' => ['required', 'string', 'max:120'],
            'customer.phone' => ['required', 'string', 'regex:/^09[0-9]{7,9}$/'],

            'township_id' => ['required', 'integer', 'exists:townships,id'],
            'address_line' => ['required', 'string', 'min:5', 'max:500'],
            'landmark' => ['required', 'string', 'min:5', 'max:255'],
            'note' => ['nullable', 'string', 'max:500'],

            'payment_method' => ['required', 'in:cod,kbzpay,wave'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:20'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'customer.phone.regex' => 'Phone must start with 09 and contain 9 to 11 digits.',
            'landmark.min' => 'Please add a landmark so the courier can find you.',
            'items.required' => 'Your cart is empty.',
        ];
    }
}
