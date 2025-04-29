import { startService, handleMigrations, initializeData } from "@aio-chat/service";

const config = {
    PORT: 5555,
    SERVICE_URL: "http://localhost:5555",
    CORS_ORIGIN: ["http://localhost:8000"],

    DB_PATH: "database/database.sqlite",
    user_mapping : {
        full_name: {
            name: "username",
            default: "User",
        },
        email: {
            name: "email",
            default: "emaiol",
        },
        password: {
            name: "password",
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
        handleMigrations();
        initializeData(
            [
                {
                    email: "example",
                    password: "example",
                    role : "user",
                }, 
                {
                    email: "demo",
                    password: "demo",
                    role : "demo",
                }
            ]
        );
        // revertMigrations()
        console.log("Chat service started successfully.")
        // initializeData();
    })
    .catch((err) => console.error("Failed to start chat service:", err));
