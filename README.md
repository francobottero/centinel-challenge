# Centel Interview

## Stack

- NextJS
- Firebase
- GeminiAI
- Vercel

## Documentation

#### DB Approach:
My database approach was first to make a simple PostgreSQL database. The idea was simple, create users, users can upload a file, and with an external call to GeminiAI it'll get computed and stored in the database.

As a first approach it was good, but then it escalated when trying to add complexity to it.

First step was trying to make it asynchronous, what happens if an user wants to bulk upload files? My database approach would still hold up, but I would need to add asynchronous workers. This being my first approach, worked by adding redis and a queue.

Second step was brought by the question of _how could I show the user that the files were being processed asynchronously?_. This is where I first went through some different solutions, but everything pointed out to WebSockets. At first, my approach was to just use native WebSockets and work with it. Essentially, I would generate a specific ID for a bulk update and get all the reports that share that ID. Every report would have a status (uploaded/processing/completed/failed), and through that status I would see how many were left and out of that what was the percentage of files processed.
