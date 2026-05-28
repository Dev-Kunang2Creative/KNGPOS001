<?php

use App\Http\Controllers\Api\XenditCallbackController;
use Illuminate\Support\Facades\Route;

Route::post('xendit/callback', XenditCallbackController::class)->name('api.xendit.callback');
