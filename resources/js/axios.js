import axios from "axios";

axios.defaults.xsrfCookieName = 'csrftoken'

const axiosInstance  = axios.create({
    // change server url dependingon on vue mode (dev or production)
    baseURL: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000/',
    timeout: 15000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
    }
})

axiosInstance.interceptors.response.use(
    response => response, 
    error => {
        // Create an object with message, error, status code
        const errorDetails = {
            message: error.response?.data?.message || 'An error occurred',
            error: error.response?.data?.error || error.response?.statusText,
            status: error.response?.status || 500,
        };
        return Promise.reject(errorDetails);
    }
);

export const $axios = axiosInstance;
