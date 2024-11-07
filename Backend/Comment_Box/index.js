// connect to the database berfore using

// importing modules
import express from 'express';
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { Chat } from "./models/Chat.js"
import { availableParallelism } from 'node:os';
import cluster from 'node:cluster';
import { createAdapter, setupPrimary } from '@socket.io/cluster-adapter';

if (cluster.isPrimary) {
    const numCPUs = availableParallelism();
    // create one worker per available core
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork({
            PORT: 3000 + i
        });
    }

    // set up the adapter on the primary thread
    setupPrimary();
} else {
    // declating instances
    let data = await mongoose.connect('');            
    const app = express();
    const server = createServer(app);
    const io = new Server(server, {
        // set up the adapter on each worker thread
        adapter: createAdapter()
    });
    var count = -1;

    const __dirname = dirname(fileURLToPath(import.meta.url)) // gives the directory path from the modules's file apth

    app.get('/', (req, res) => {                       // sending get requests to load the html file
        res.sendFile(join(__dirname, 'index.html'));
    });

    io.on('connection', async (socket) => {
        socket.on('chat message', async (msg) => {          // taking messages from the client
            try {
                const text = new Chat({ id: (count + 1), message: msg });  // making objects to store in mongoDB
                await text.save();                        // saving it    
                count++;
                io.emit('chat message', msg, count);            // sending the text messag to the client
            } catch (error) {
                console.log("Error saving the message", error);  // In case there is an error while saving
            }
        });
        if (!socket.recovered) {
            try {
                const lastId = socket.handshake.auth.serverOffSet;
                // find all id where id is greater than lastId
                const messages = await Chat.find({ id: { $gt: lastId } }).sort({ id: 1 });
                //Send each message back to client
                messages.forEach((message) => {
                    socket.emit('chat message', message.message, message.id);
                });

            } catch (error) {
                console.log("Error encountered while retreiving messages", error);
                // Handle error if needed
            }
        }
        console.log('A user connected');
        socket.on('disconnect', () => {              // when user disconnects
            // We will use the later code in future when we deal with chatbox in game
            // Chat.deleteMany({})                      // Emptying the ocllection after each session
            //     .then(() => {                            // handling success
            //         console.log('Collection emptied successfully');
            //     })
            //     .catch(err => {                         // handling error
            //         console.error('Error emptying collection:', err);
            //     });
            console.log('user disconnected');
        });
    });

    const port = process.env.PORT;

    server.listen(port, () => {
        console.log(`server running at http://localhost:${port}`);
    });
}