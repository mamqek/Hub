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
     * User login
     *
     * @param \Illuminate\Http\Request $request
     * 
     * Request data:
     * - identifier: string (required) Either email or username of the user
     * - password: string (required) The user's password.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function login(Request $request) {

        // Retrieve the user by username or email
        $user = User::where('username', $request->identifier)
        ->orWhere('email', $request->identifier)
        ->first();

        if (!$user) {
            return response()->json([
            'status' => __('response.error'),
            'message' => __('auth.failed'), // User not found
            ], 401);
        }
        Log::info(session()->all());

        // Check if the password is correct
        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
            'status' => __('response.error'),
            'message' => __('auth.password'), // Incorrect password
            ], 401);
        }
        
        // If everything is correct, log in the user
        Auth::login($user);
        Log::info(session()->all());
        return response()->json([
            'status' => __('response.success'),
            'message' => __('response.*_successful', ['action' => __('login')]),
            'user' => $user 
        ], 200);

    }

    /**
     * User register
     *
     * @param \Illuminate\Http\Request $request
     * 
     * Request data:
     * - username: string (required) How we call user in app. Can be name or nickname
     * - email: string (required) User's email address
     * - password: string (required) The user's password.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function register(Request $request) {

        $request->validate([
            'username' => 'required|unique:users,username',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed'
        ], [
            // could be custom messages, but default are good enough
            // 'username.unique' => 'This username is already taken.',
            // 'email.unique' => 'This email is already taken.',
        ]);

        $role = "user";

        $soulUsers = ["Olga Mukhacheva"];

        if (in_array($request->username, $soulUsers)) {
            $role = "soulUser";
        }

        $user = User::create([
            'username' => $request->username,
            'email' => $request->email,
            'password' => $request->password,
            'role' => $role,
        ]);

        return response()->json([
            'status' => __('response.success'),
            'message' => __('response.account_created'),
            'user' => $user
        ], 200);
    }


    public function authenticate()
    {   
        if (!Auth::check()) {
            return false;
        }

        return Auth::user();
    }

    public function logout()
    {
        try {
            Auth::logout();
            $locale = session('locale');
            // Invalidate the session completely
            request()->session()->invalidate();

            // Regenerate the session ID to prevent session fixation attacks
            // Regenerate CSRF token to avoid 419 which happens after 2 above calls until page reload
            request()->session()->regenerateToken();

            session(['locale' => $locale]);

            return response()->json([
                'status' => __('response.success'),
                'message' => __('response.*_successful', ['action' => __('logout')]),
                'csrf_token' => csrf_token()
            ], 200);

        } catch (\Exception $e) {

            return response()->json([
                'status' => __('response.error'),
                'message' => __('response.error_while_*', ['action' => __('logout'), 'attribute' => ""]), // Incorrect password
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
