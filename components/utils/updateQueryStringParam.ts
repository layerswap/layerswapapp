export default function updateQueryStringParam(key, value) {
    const baseUrl = [location.protocol, '//', location.host, location.pathname].join('');
    const urlQueryString = document.location.search;
    var newParam = key + '=' + value,
        params = '?' + newParam;

    if (urlQueryString) {
        const keyRegex = new RegExp('([\?&])' + key + '[^&]*');
        if (urlQueryString.match(keyRegex) !== null) {
            params = urlQueryString.replace(keyRegex, "$1" + newParam);
        } else {
            params = urlQueryString + '&' + newParam;
        }
    }
    window.history.replaceState({ ...window.history.state }, "", baseUrl + params);
}