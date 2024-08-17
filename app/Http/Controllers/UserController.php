<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{

    /**
     * Handle a login request to the application.
     *
     * @param \Illuminate\Http\Request $request
     * 
     * Request data:
     * - email: string (required) The email address of the user.
     * - password: string (required) The user's password.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function login(Request $request) {
        // Retrieve the user by email
        $user = User::where('email', $request->username)->first();

        // Check if the user exists and the password is correct
        if ($user && Hash::check($request->password, $user->password)) {
            Auth::login($user);
            return response()->json([
                'status' => 'success',
                'message' => 'Login successful',
                'user' => $user
            ], 200);
        } else {
            // Password does not match or user doesn't exist
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid credentials',
                'error' => "User not found"
            ], 401);
        }

    }


    public function authenticate()
    {   
        // if (!Auth::check()) {
        //     Log::info('User is not logged in');
        //     $user = User::where('email', 'test@example.com')->first();
        //     Auth::login($user);
        // }
        Log::info(Auth::check());
        return Auth::check();
    }
}
