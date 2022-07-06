function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    var isiOSDevice = navigator.userAgent.match(/ipad|iphone/i);

    if (isiOSDevice) {

        var editable = textArea.contentEditable;
        var readOnly = textArea.readOnly;

        textArea.contentEditable = 'true';
        textArea.readOnly = false;

        var range = document.createRange();
        range.selectNodeContents(textArea);

        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        textArea.setSelectionRange(0, 999999);
        textArea.contentEditable = editable;
        textArea.readOnly = readOnly;

    }

    try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Fallback: Copying text command was ' + msg);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
}
export function copyTextToClipboard(text) {

    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text).then(function () {
        console.log('Async: Copying to clipboard was successful!');
    }, function (err) {
        console.error('Async: Could not copy text: ', err);
    });
}