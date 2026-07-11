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
            'bank_name'      => ['nullable', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:100'],
            'account_holder' => ['nullable', 'string', 'max:255'],
            'split_type'     => ['required', 'string', Rule::in(['percentage', 'nominal'])],
            'percent_amount' => ['required_if:split_type,percentage', 'numeric', 'min:0', 'max:100'],
            'nominal_amount' => ['required_if:split_type,nominal', 'numeric', 'min:0'],
            'is_active'      => ['sometimes', 'boolean'],
            'sort_order'     => ['sometimes', 'integer', 'min:0'],
        ];
    }
    
    protected function prepareForValidation(): void
    {
        // If split_type is nominal, force percent_amount to 0 and vice versa
        if ($this->input('split_type') === 'nominal') {
            $this->merge(['percent_amount' => 0]);
        } elseif ($this->input('split_type') === 'percentage') {
            $this->merge(['nominal_amount' => 0]);
        }
    }
}
