const express = require('express')
const socket = require('socket.io')

const app = express()
const server = app.listen(3000)

app.use(express.static('public'))

const io = socket(server)

const users = {}

io.on('connection', (socket) =>{
    console.log(socket.id)

    console.log('new User')

    socket.on('new-user', name=> {
        users[socket.id] = name
        socket.broadcast.emit('user-connected', name)
    })

    socket.on('send-chat-message', message =>
    {
        socket.broadcast.emit('chat-message', {message: message, name: users[socket.id]})
    })

    socket.on('disconnect', () =>
    {
        socket.broadcast.emit('user-disconnected', users[socket.id])
        delete users[socket.id]
    })

    socket.on('chat', data => {
        io.sockets.emit('chat',data)
    })
})