/** Floor plan geometry calculations */

export function calculateArea(width, height) {
    return width * height;
}

export function calculatePerimeter(width, height) {
    return 2 * (width + height);
}

export function feetToMeters(feet) {
    return feet * 0.3048;
}

export function metersToFeet(meters) {
    return meters / 0.3048;
}

export function sqFtToSqM(sqFt) {
    return sqFt * 0.0929;
}

export function checkRoomOverlap(room1, room2) {
    return !(
        room1.x + room1.w <= room2.x ||
        room2.x + room2.w <= room1.x ||
        room1.y + room1.h <= room2.y ||
        room2.y + room2.h <= room1.y
    );
}

export function isInsideBoundary(room, boundary) {
    return (
        room.x >= boundary.x &&
        room.y >= boundary.y &&
        room.x + room.w <= boundary.x + boundary.w &&
        room.y + room.h <= boundary.y + boundary.h
    );
}

export function getRoomCenter(room) {
    return {
        x: room.x + room.w / 2,
        y: room.y + room.h / 2,
    };
}

export function calculateDistance(p1, p2) {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

export function snapToGrid(value, gridSize = 10) {
    return Math.round(value / gridSize) * gridSize;
}
