const FormattedDate = ({ date }: { date: string }) => {
    const swapDate = new Date(date);
    const yyyy = swapDate.getFullYear();
    let mm = swapDate.getMonth() + 1; // Months start at 0!
    let dd = swapDate.getDate();

    if (dd < 10) dd = 0 + dd;
    if (mm < 10) mm = 0 + mm;

    return <>{dd + '/' + mm + '/' + yyyy}</>;
}
export default FormattedDate