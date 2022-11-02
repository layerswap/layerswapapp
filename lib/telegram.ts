const feedbackToken = "5366632516:AAHRlo58yEgoAj2-qe2poJOR19ybOuGMBpQ"
const feedbackChat_id = "-1001625192521";
const errorToken = '5438366819:AAHhbISk7q_Wx2CpKUVBCAfIsidhp_bmGKM'
const errorChat_id = '-1001844311453'

export const SendFeedbackMessage = async (title: string, text: string) => {
    return await (await fetch(`https://api.telegram.org/bot${feedbackToken}/sendMessage?chat_id=${feedbackChat_id}&text=${title} %0A ${text}`)).json()
}

export const SendErrorMessage = async (title: string, text: string) => {
    if (text.length > 2000)
    {
        text = text.slice(0, 2000);
    }
    
    return await (await fetch(`https://api.telegram.org/bot${errorToken}/sendMessage?chat_id=${errorChat_id}&text=${title} %0A ${text}`)).json()
}