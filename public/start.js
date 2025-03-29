const createRoomBtn = document.getElementById('create-room');
const joinRoomBtn = document.getElementById('join-room');
const roomCodeInput = document.getElementById('room-code');
const roomCodeDisplay = document.getElementById('room-code-display');
const goToRoomBtn = document.getElementById('go-to-room');
const roomInfo = document.querySelector('.room-group');
const joinGroupHelp = document.querySelector('.join-group .help');
const joinPreview = document.getElementById('join-preview');
const joinGroup = document.querySelector('.join-group');

createRoomBtn.addEventListener('click', () => {
  fetch('/create-room', { method: 'POST' })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      const roomId = data.roomId;
      roomCodeDisplay.innerHTML = `Your room: <a href="http://141.147.17.176/${roomId}" class="room-code-text">${roomId}</a>`;
      createRoomBtn.classList.add("hidden");
      roomInfo.classList.remove("hidden");
      goToRoomBtn.onclick = () => {
        window.location.href = `/${roomId}`;
      };

      /* // room-12345 --> copy feature (only in HTTPS)
      const roomCodeSpan = roomCodeDisplay.querySelector('.room-code-text');
      roomCodeSpan.addEventListener('click', () => {
        navigator.clipboard.writeText(roomId).then(() => {
          const copiedSpan = document.createElement('span');
          copiedSpan.className = 'copied';
          copiedSpan.textContent = 'Copied!';
          roomCodeDisplay.querySelector(".room-code-text").appendChild(copiedSpan);

          // удаляем всплывающее сообщение через 2 секунды
          setTimeout(() => {
            copiedSpan.remove();
          }, 2000);

        }).catch(err => {
          console.error('Failed to copy:', err);
          roomCodeDisplay.textContent = 'Failed to copy code.';
        });
      });
      */
    })
    .catch(error => {
      console.error('Error creating room:', error);
      roomCodeDisplay.textContent = 'Error creating room. Try again.';
    });
});

joinPreview.addEventListener('click', () => {
  joinGroup.classList.remove('hidden');
  joinPreview.classList.add('hidden');
});

joinRoomBtn.addEventListener('click', () => {
  const roomId = roomCodeInput.value.trim().toLowerCase(); // убираем пробелы и только маленькие буквы
  if (roomId) {
    window.location.href = `/${roomId}`;
  } else {
    joinGroupHelp.classList.remove("hidden");
  }
});
