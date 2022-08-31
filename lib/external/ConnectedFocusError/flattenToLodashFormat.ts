const OBJECT_DELIMITERS = ".";
const ARRAY_START_DELIMITER = "[";
const ARRAY_END_DELIMITER = "]";

export default function flattenToLodashFormat(target: {}): {} {
  const output = {} as { [key: string]: string };

  function step(value: any, prev = "") {
    const type = Object.prototype.toString.call(value);
    const isObject = type === "[object Object]" || type === "[object Array]";
    const isArray = Array.isArray(value);

    if (!isArray && isObject) {
      Object.keys(value).forEach(function (key: string) {
        let newKey = prev ? prev + OBJECT_DELIMITERS + key : key;

        step(value[key], newKey);
      });
    } else if (isArray) {
      value.forEach((arrayValue: any, index: number) => {
        const arrayKey =
          prev + ARRAY_START_DELIMITER + index + ARRAY_END_DELIMITER;

        step(arrayValue, arrayKey);
      });
    } else {
      output[prev] = value;
    }
  }

  step(target);

  return output;
}
