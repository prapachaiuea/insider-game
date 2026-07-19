const ROOM_KEY = "insider:lastRoomId";
const NAME_KEY = "insider:lastName";

export function saveLastRoom(roomId) {
  localStorage.setItem(ROOM_KEY, roomId);
}

export function getLastRoom() {
  return localStorage.getItem(ROOM_KEY);
}

export function clearLastRoom() {
  localStorage.removeItem(ROOM_KEY);
}

export function saveLastName(name) {
  localStorage.setItem(NAME_KEY, name);
}

export function getLastName() {
  return localStorage.getItem(NAME_KEY) || "";
}
