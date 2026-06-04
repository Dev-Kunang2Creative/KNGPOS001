<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class RejectSelfOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('pos.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }
}
