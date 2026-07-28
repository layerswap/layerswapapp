export default function upperCaseKeys(obj: object) {
    return Object.keys(obj).reduce((accumulator, key) => {
        accumulator[key.toUpperCase()] = obj[key];
        return accumulator;
    }, {});
}