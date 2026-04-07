import { io } from "socket.io-client";

export function initLiveRoom() {
  const container = document.getElementById('view-live-room');
  if (!container) return;
  
  // The backend socket.io runs on port 5000 in dev
  const socket = io("http://localhost:5000");

  const roomState = {
    joined: false,
    roomId: null,
    username: null
  };

  const joinBtn = document.getElementById('btn-join-room');
  const leaveBtn = document.getElementById('btn-leave-room');
  const sendBtn = document.getElementById('btn-send-room');
  const roomInput = document.getElementById('input-room-id');
  const msgInput = document.getElementById('input-room-msg');
  const chatDisplay = document.getElementById('live-chat-display');

  // Load username from local storage (set during login)
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    roomState.username = user ? user.name : 'Anonymous';
  } catch(e) {
    roomState.username = 'Student';
  }

  function appendMessage(text, sender, isSystem = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('live-message');
    if (isSystem) {
      msgDiv.classList.add('system-msg');
      msgDiv.style.color = '#aaa';
      msgDiv.style.fontStyle = 'italic';
      msgDiv.style.margin = '5px 0';
      msgDiv.textContent = text;
    } else {
      msgDiv.innerHTML = `<strong>${sender}:</strong> <span>${text}</span>`;
    }
    chatDisplay.appendChild(msgDiv);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
  }

  joinBtn.addEventListener('click', () => {
    const rId = roomInput.value.trim();
    if (!rId) return alert('Enter a Room ID first');

    roomState.roomId = rId;
    socket.emit('join-room', rId, roomState.username);
    roomState.joined = true;
    
    joinBtn.style.display = 'none';
    leaveBtn.style.display = 'inline-block';
    roomInput.disabled = true;
    
    appendMessage(`You joined Study Room: ${rId}`, 'System', true);
  });

  leaveBtn.addEventListener('click', () => {
    // Actually no 'leave-room' emit logic on backend yet, but we can disconnect client locally
    socket.disconnect();
    roomState.joined = false;
    roomState.roomId = null;
    
    joinBtn.style.display = 'inline-block';
    leaveBtn.style.display = 'none';
    roomInput.disabled = false;
    
    appendMessage('You have left the room.', 'System', true);
    
    // Re-connect the socket for future joins
    socket.connect();
  });

  sendBtn.addEventListener('click', () => {
    if (!roomState.joined) return alert('Join a room first!');
    const text = msgInput.value.trim();
    if (!text) return;

    // Emit to server
    socket.emit('send-message', roomState.roomId, { username: roomState.username, text });
    
    // Append locally
    appendMessage(text, 'You');
    msgInput.value = '';
  });

  // Also support pressing Enter
  msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
  });

  // Socket event listeners
  socket.on('user-joined', (data) => {
    appendMessage(`${data.username} jumped into the room!`, 'System', true);
  });

  socket.on('receive-message', (data) => {
    appendMessage(data.text, data.username);
  });
}
