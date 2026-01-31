import { startService, handleMigrations, initializeData } from "@aio-chat/service";

const config = {
    PORT: 5555,
    SERVICE_URL: "http://localhost:5555",
    CORS_ORIGIN: ["http://127.0.0.1:8000", "http://localhost:8000", "https://hub-mamqek.vercel.app"],

    // DB_PATH: "database/database.sqlite",

    DB_TYPE: "postgres",
    DB_URL: "postgresql://postgres.gquvgjieqndssqwqrqdi:Vlad311020022%21@aws-0-eu-central-1.pooler.supabase.com:5432/postgres", // Note: %21 instead of !
    // production: false,

    user_mapping : {
        full_name: {
            name: "username",
            default: "User",
        },
        email: {
            name: "email",
            default: "email",
        },
        password: {
            name: "password",
            isNullable: true,
        },
        role: {
            name: "role",
        },
    },

    logging: [ "error"],
    // synchronize: true,
};



startService(config)
    .then(async () => {
        await handleMigrations();
        await initializeData(
            [
                {
                    email: "example",
                    password: "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // bcrypt hash for "password" (Laravel’s default factory hash)
                    role : "user",
                }, 
                {
                    email: "demo",
                    password: "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
                    role : "demo",
                }
            ]
        );
        // revertMigrations()
        console.log("Chat service started successfully.")
        // initializeData();
    })
    .catch((err) => console.error("Failed to start chat service:", err));
