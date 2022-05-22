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


/**************************************************************************************** */

const rev_sbox = [
    0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb,
    0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb,
    0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e,
    0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25,
    0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92,
    0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84,
    0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06,
    0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b,
    0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73,
    0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e,
    0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b,
    0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4,
    0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f,
    0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef,
    0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
    0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d];

function mix(s) {
    for (let c=0; c<4; c++) {
        const a = new Array(4);  // 'a' is a copy of the current column from 's'
        const b = new Array(4);  // 'b' is a•{02} in GF(2^8)
        for (let r=0; r<4; r++) {
            a[r] = s[c][r];
            b[r] = s[c][r]&0x80 ? s[c][r]<<1 ^ 0x011b : s[c][r]<<1;
        }
        // a[n] ^ b[n] is a•{03} in GF(2^8)
        s[c][0] = b[0] ^ a[1] ^ b[1] ^ a[2] ^ a[3]; // {02}•a0 + {03}•a1 + a2 + a3
        s[c][1] = a[0] ^ b[1] ^ a[2] ^ b[2] ^ a[3]; // a0 • {02}•a1 + {03}•a2 + a3
        s[c][2] = a[0] ^ a[1] ^ b[2] ^ a[3] ^ b[3]; // a0 + a1 + {02}•a2 + {03}•a3
        s[c][3] = a[0] ^ b[0] ^ a[1] ^ a[2] ^ b[3]; // {03}•a0 + a1 + a2 + {02}•a3
    }
    return s;
}

function plainstring(plain) {
    let encrypted_text = ''
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            encrypted_text += (plain[i][j].toString(16).length === 2) ? plain[i][j].toString(16) : ('0' + plain[i][j].toString(16));
        }
    }
    return encrypted_text
}

function getKey(string) {
    let key =[[],[],[],[]]
    let ind = 0
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {

            key[i][j] = parseInt(string.substring(ind,ind+2),16)
            ind +=2;
        }
        
    }

    ind = 0
    return key
}

let inverse_row = function(Array) {
    ///////////////
    let temp = Array[0][1];
    Array[0][1]= Array[1][1];
    Array[1][1]= Array[2][1];
    Array[2][1]= Array[3][1];
    Array[3][1] = temp;

    temp = Array[0][1];
    Array[0][1]= Array[1][1];
    Array[1][1]= Array[2][1];
    Array[2][1]= Array[3][1];
    Array[3][1] = temp;
    temp = Array[0][1];
    Array[0][1]= Array[1][1];
    Array[1][1]= Array[2][1];
    Array[2][1]= Array[3][1];
    Array[3][1] = temp;

    //////////////////
    temp = Array[0][2];
    Array[0][2]= Array[1][2];
    Array[1][2]= Array[2][2];
    Array[2][2]= Array[3][2];
    Array[3][2] = temp;
    temp = Array[0][2];
    Array[0][2]= Array[1][2];
    Array[1][2]= Array[2][2];
    Array[2][2]= Array[3][2];
    Array[3][2] = temp;

    ///////////////////
    temp = Array[0][3];
    Array[0][3]= Array[1][3];
    Array[1][3]= Array[2][3];
    Array[2][3]= Array[3][3];
    Array[3][3] = temp;

    return Array;
}


function AES_128_Decryption(本文,鍵){
    let count = 0;
    var plain = new Array(4);
    for (var i = 0; i < 4; i++) {
        plain[i] = new Array(4);
    }
    for (let i = 0; i < 4; i++) {
        for (let y = 0; y < 4; y++) {
            plain[i][y] = parseInt(本文.substring(count,count+2),16);
            count += 2;
        }
    }
    
    // ADD Round Key
    let key = getKey(鍵.substring(鍵.length - 32,鍵.length))
    count = 0;
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            plain[i][j] = plain[i][j] ^ key[i][j];
            count+=2;
        }
    }
        plain = inverse_row(plain)
        
        // 2-) inverse sbox
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                plain[i][j] = rev_sbox[plain[i][j]];
            }
        }
    count = 0;

    /* LOOP*/
    for (let round = 0; round < 9; round++) {
        let key = getKey(鍵.substring(鍵.length - (32 * (round+2)) ,鍵.length - (32 * (round+1))))
         //3-)add round key
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                plain[i][j] = plain[i][j] ^ key[i][j];
                count+=2;
            }
        }
        count = 0;
        //Inverse Mix
        plain = mix(plain)
        plain = mix(plain)
        plain = mix(plain)

        //inverse row
        plain = inverse_row(plain)
        
        // 2-) inverse sbox
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                plain[i][j] = rev_sbox[plain[i][j]];
            }
        }
        
    }

    key = getKey(鍵.substring(0,32))
    for (let i = 0; i < 4; i++) {
        
        for (let j = 0; j < 4; j++) {
            
            plain[i][j] = plain[i][j] ^ key[i][j];;
            count+=2;
        }
    }
    count = 0
    return plainstring(plain)
}
const genRanHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

/************************************************************************************************* */
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

    socket.on('send-chat-message', (room, message,key) =>
    {
        let decrypted = ''
        console.log("Key: " + key)
        console.log("message: " + message)
        console.log("decrpt: " + decrypted)

        for (let i = 0;message.length / 32 != i; i++) {
            decrypted += AES_128_Decryption(message.substring(32*i,32*(i+1)),key)
        }

        let zero = decrypted.replace('0000', '')
        console.log("decrpt: " + zero)
        let original = '' 
        for (let i = 0; parseInt(zero.length / 4) > i; i++) {
            if(zero.substring((4 * i),4 * (i+1)) === '0000') {
                break;
            }
            original += String.fromCharCode(
                parseInt(zero.substring((4 * i),4 * (i+1)),16)
            )
        }
        console.log("original: " + original)
        //Sending message only for the room participants.
        io.to(room).emit('chat-message', { message: original, name: rooms[room].users[socket.id] })
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