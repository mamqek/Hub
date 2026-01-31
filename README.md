# Vercel 

## Preview 
You will get it on URL which changes as it includes deployment hash like https://hub-czmv3nzt8-mamqek.vercel.app/
vercel .

## Production 
You will get it on static url like  https://mamqek-hub.vercel.app/
vercel . --prod 

if try promoting via vercel dashboard u will get a php error 


# Start

Run [setup script](#setup-script) or go through installation manually in [Manual process](#manual-process)
After that [Run application](#run-application)

## Setup script 

Firstly install dependencies 

    composer install
    npm install

(could not include them in the setup script as it stops after composer install for some reason)

### On Linux/MacOs

Run the following command to make the script executable:

    chmod +x setup.sh

In the terminal, run the script by executing:

    ./setup.sh

### On Windows 

Run the setup.bat script by double-clicking it or executing it in Command Prompt or PowerShell.

    setup.bat

## Run application

    php artisan serve

in another terminal - 

    npm run dev 

=> click on APP_ENV link


## Manual process

### Install dependencies
    composer install

    npm install

### Initialize env 

    cp .env.example .env

    php artisan key:generate

### Initialize database
#### For Unix

    touch database/database.sqlite

#### For windows (in terminal I have powershell)

    New-Item -Path .\database\database.sqlite -ItemType File

### Populate database

    php artisan migrate

    php artisan db:seed


