import mongoose from "mongoose";    

const ChatSchema = new mongoose.Schema({
    id: Number,
    message: String
});

export const Chat = mongoose.model('Chat', ChatSchema);