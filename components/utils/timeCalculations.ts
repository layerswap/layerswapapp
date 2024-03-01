export function getSecondsToTomorrow() {
    let now = new Date();
    let hour = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    let totalSecondsToday = (hour * 60 + minutes) * 60 + seconds;
    let totalSecondsInADay = 86400;

    return totalSecondsInADay - totalSecondsToday;
}

export function calculateSeconds(time: string) {
    const a = time?.split(':');
    const seconds = a && (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);

    return seconds
}