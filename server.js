const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
//const server = app.listen(3000)

app.set('views', './views')
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true}))

const rooms = { }

app.get('/', (req, res) => {
    res.render('index', {rooms: rooms})
})

app.post('/room', (req, res) => {
    if(rooms[req.body.room] != null) {
        return res.redirect('/')
    }
    rooms[req.body.room] = { users: {} }
    res.redirect(req.body.room)
    //Sending message for the process of creating the chat room.
    io.emit('room-created', req.body.room)
}) 

app.get('/:room', (req, res) => {
    if(rooms[req.params.room] == null) {
        return res.redirect('/')
    }
    res.render('room', { roomName: req.params.room })
})

server.listen(3000)

io.on('connection', (socket) =>{
    console.log(socket.id)

    console.log('new User')

    socket.on('new-user', (room, name) => {
        socket.join(room)
        rooms[room].users[socket.id] = name
        getUserRooms(socket).forEach(room => {
            socket.to(room).emit('user-connected', rooms[room].users[socket.id])
        })
    })

    socket.on('send-chat-message', (room, message) =>
    {
        //Sending message only for the room participants.
        io.to(room).emit('chat-message', { message: message, name: rooms[room].users[socket.id] })
    })

    socket.on('disconnect', () =>
    {
        getUserRooms(socket).forEach(room => {
            socket.to(room).emit('user-disconnected', rooms[room].users[socket.id])
            delete rooms[room].users[socket.id]
        })
    })

    function getUserRooms(socket) {
        return Object.entries(rooms).reduce((names, [name, room]) => {
            if(room.users[socket.id] !=null) names.push(name)
            return names
        }, []) //objeyi arraye çeviriyor ki methodda kullanalım diye.
    }

    socket.on('chat', data => {
        io.sockets.emit('chat',data)
    })
})