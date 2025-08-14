export const getDateDifferenceString = (fromDate: Date, toDate: Date = new Date()): string => {
    let years = toDate.getFullYear() - fromDate.getFullYear();
    let months = toDate.getMonth() - fromDate.getMonth();
    let days = toDate.getDate() - fromDate.getDate();

    // Adjust negative days
    if (days < 0) {
        months--;
        const prevMonth = new Date(toDate.getFullYear(), toDate.getMonth(), 0);
        days += prevMonth.getDate();
    }

    // Adjust negative months
    if (months < 0) {
        years--;
        months += 12;
    }

    const parts: string[] = [];

    if (years > 0) {
        // Convert months to days and add to days count
        const daysFromMonths = months * 30; // Approximation
        const totalDays = days + daysFromMonths;
        parts.push(`${years} year${years !== 1 ? "s" : ""}`);
        if (totalDays > 0) parts.push(`${totalDays} day${totalDays !== 1 ? "s" : ""}`);
    } else if (months > 0) {
        parts.push(`${months} month${months !== 1 ? "s" : ""}`);
        if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
    } else {
        parts.push(`${days} day${days !== 1 ? "s" : ""}`);
    }

    return parts.join(", ") + " ago";
}