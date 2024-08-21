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
            'status' => 'error',
            'message' => __('auth.failed'), // User not found
            ], 401);
        }

        // Check if the password is correct
        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
            'status' => 'error',
            'message' => __('auth.password'), // Incorrect password
            ], 401);
        }
        
        // If everything is correct, log in the user
        Auth::login($user);
        return response()->json([
            'status' => 'success',
            'message' => 'Login successful',
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
            'status' => 'success',
            'message' => 'Registration succesfull!',
            'user' => $user
        ], 200);
    }


    public function authenticate()
    {   
        // TODO: store language for user and retrieve here
        // if (!Auth::check()) {
        //     Log::info('User is not logged in');
        //     $user = User::where('email', 'test@example.com')->first();
        //     Auth::login($user);
        // }
        Log::info(Auth::check());
        return Auth::check();
    }
}
