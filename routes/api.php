<?php

use App\Http\Controllers\Api\XenditCallbackController;
use App\Http\Controllers\Api\XenditPayoutCallbackController;
use Illuminate\Support\Facades\Route;

Route::post('xendit/callback', XenditCallbackController::class)->name('api.xendit.callback');
Route::post('xendit/payout-callback', XenditPayoutCallbackController::class)->name('api.xendit.payout-callback');
