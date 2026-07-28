import { separatedPathOf } from ".";
import { CallBackForPropertyAccess } from "./types";

/**
 * @example
 * pathOf(student, (s) => s.name.firstName[0]); // "['name']['firstName']['0']"
 * pathOf<Student>((s) => s.name.firstName[0]); // "['name']['firstName']['0']"
 */
export function pathOf<T>(callback: CallBackForPropertyAccess<T>): string;
export function pathOf<T>(
  obj: T,
  callback: CallBackForPropertyAccess<T>
): string;

export function pathOf<T>(
  arg1: T | CallBackForPropertyAccess<T>,
  arg2?: CallBackForPropertyAccess<T>
): string {
  const separatedPath = separatedPathOf(arg1, arg2);
  if (separatedPath.length === 0) {
    throw new Error("ts-nameof-proxy: No properties were read.");
  }
  return "['" + separatedPath.join("']['") + "']";
}
