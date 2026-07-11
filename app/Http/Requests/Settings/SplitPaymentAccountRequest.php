<?php

namespace App\Http\Requests\Settings;

use App\Services\SplitPaymentService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SplitPaymentAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $bankCodes = array_keys(SplitPaymentService::BANK_CHANNELS);

        return [
            'name'           => ['required', 'string', 'max:255'],
            'bank_code'      => ['nullable', 'string', Rule::in($bankCodes)],
            'bank_name'      => ['nullable', 'string', 'max:255'], // can be derived from bank_code in frontend
            'account_number' => ['nullable', 'string', 'max:100'],
            'account_holder' => ['nullable', 'string', 'max:255'],
            'percent_amount' => ['required', 'numeric', 'min:0.01', 'max:100'],
            'is_active'      => ['sometimes', 'boolean'],
            'sort_order'     => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
