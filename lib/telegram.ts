const token = "5366632516:AAHRlo58yEgoAj2-qe2poJOR19ybOuGMBpQ"
const chat_id = "-1001625192521";

export const SendMessage = async (title: string, text: string) => {
    return await (await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat_id}&text=${title} %0A ${text}`)).json()
}