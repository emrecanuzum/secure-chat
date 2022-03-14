const socket = io.connect('https://secure-chat-neon.vercel.app/')

const sender = document.getElementById('sender')
const message = document.getElementById('message')
const submitBtn = document.getElementById('submitBtn')
const output = document.getElementById('output')
const feedback = document.getElementById('feedback')

submitBtn.addEventListener('click', () => {
socket.emit('chat', {
    message: message.value,
    sender: sender.value
 })
})

socket.on('chat', data => {
    output.innerHTML +='<p><strong>' + data.sender + ' : </strong>' + data.message + '</p>'
})