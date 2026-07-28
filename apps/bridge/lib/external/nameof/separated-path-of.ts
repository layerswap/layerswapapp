import { CallBackForPropertyAccess } from "./types";

/**
 * @example
 * separatedPathOf(student, (s) => s.age);          // ["age"]
 * separatedPathOf(student, (s) => s.name.length);  // ["name", "length"]
 * separatedPathOf<Student>((s) => s.name.length);  // ["name", "length"]
 */
export function separatedPathOf<T>(
  callback: CallBackForPropertyAccess<T>
): string[];
export function separatedPathOf<T>(
  obj: T,
  callback?: CallBackForPropertyAccess<T>
): string[];

export function separatedPathOf<T>(
  arg1: T | CallBackForPropertyAccess<T>,
  arg2?: CallBackForPropertyAccess<T>
): string[] {
  const path: string[] = [];

  const handler: ProxyHandler<Object> = {
    get(_target, property) {
      if (typeof property === "symbol") {
        throw new Error(
          `ts-nameof-proxy: The path cannot contain ${property.toString()}.`
        );
      }
      path.push(property);
      return new Proxy({}, handler);
    },
  };

  const proxy = new Proxy({}, handler);
  const callback = (
    typeof arg2 === "function" ? arg2 : arg1
  ) as CallBackForPropertyAccess<T>;

  callback(proxy as T);

  return path;
}
