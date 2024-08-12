@echo off

REM Initialize env file
echo Initializing .env file... 
copy .env.example .env
php artisan key:generate 

REM Initialize database
echo Initializing database...
IF NOT EXIST database\database.sqlite (
    echo Creating SQLite database file...
    New-Item -Path .\database\database.sqlite -ItemType File
)

REM Populate database
echo Populating database...
php artisan migrate
php artisan db:seed

echo Setup completed successfully!
pause
